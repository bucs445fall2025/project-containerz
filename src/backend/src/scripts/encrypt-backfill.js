const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
// IMPORTANT: load env BEFORE requiring the model, because the model pulls in crypto/keyring
const User = require('../models/User.js');

// ----- Config -----
const DRY_RUN = process.argv.includes('--dry-run'); // test without saving
const UNSET_PLAINTEXT = true; // unset legacy plaintext fields after encrypting

// Accept either env name
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error('MONGODB_URI (or MONGO_URI) missing in env');
}
if (!process.env.ENCRYPTION_KEY_BASE64) {
  throw new Error('ENCRYPTION_KEY_BASE64 is missing in env');
}

// Read a raw (possibly legacy) field directly from the collection
async function readLegacyFieldRaw(userId, fieldName) {
  const doc = await mongoose.connection.db
    .collection('users')
    .findOne({ _id: userId }, { projection: { [fieldName]: 1 } });
  return doc ? doc[fieldName] : undefined;
}

// Backfill a single field using the virtual (e.g., plaidTransactions -> plaidTransactionsEnc)
async function backfillField(u, { legacyPlainField, virtualName, encFieldPath }) {
  const hasEnc = !!u.get(`${encFieldPath}.ct`);
  if (hasEnc) return { changed: false, reason: 'already_encrypted' };

  // Try schema field first (if it still exists)
  let raw = u.get(legacyPlainField, null, { getters: false, virtuals: false });

  // If not present in schema, read raw from DB
  if (!Array.isArray(raw)) {
    raw = await readLegacyFieldRaw(u._id, legacyPlainField);
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { changed: false, reason: 'no_plaintext' };
  }

  // Setting the virtual triggers AES-GCM encryption into *Enc via your model
  u.set(virtualName, raw);

  if (DRY_RUN) return { changed: true, dryRun: true };

  await u.save();

  if (UNSET_PLAINTEXT) {
    await mongoose.connection.db.collection('users').updateOne(
      { _id: u._id },
      { $unset: { [legacyPlainField]: 1 } }
    );
  }

  return { changed: true };
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {});

    // Users missing at least one encrypted blob
    const query = {
      $or: [
        { 'plaidTransactionsEnc.ct': { $exists: false } },
        { 'plaidInvestmentsEnc.ct':  { $exists: false } },
      ],
    };

    const cursor = User.find(query)
      .select('+plaidTransactionsEnc +plaidInvestmentsEnc') // we will set these
      .cursor();

    let scanned = 0;
    let changedTx = 0;
    let changedInv = 0;

    for await (const u of cursor) {
      scanned++;

      // Transactions
      const txRes = await backfillField(u, {
        legacyPlainField: 'plaidTransactions',
        virtualName:      'plaidTransactions',
        encFieldPath:     'plaidTransactionsEnc',
      });
      if (txRes.changed) changedTx++;

      // Investments
      const invRes = await backfillField(u, {
        legacyPlainField: 'plaidInvestments',
        virtualName:      'plaidInvestments',
        encFieldPath:     'plaidInvestmentsEnc',
      });
      if (invRes.changed) changedInv++;

      // Per-user reason logging (helps diagnose no-ops)
      console.log(
        `[${u._id}] tx=${txRes.reason || (txRes.changed ? (DRY_RUN ? 'will_encrypt' : 'encrypted') : 'noop')} `
        + `inv=${invRes.reason || (invRes.changed ? (DRY_RUN ? 'will_encrypt' : 'encrypted') : 'noop')}`
      );

      if (scanned % 100 === 0) {
        console.log(`Scanned: ${scanned}, changedTx: ${changedTx}, changedInv: ${changedInv}`);
      }
    }

    console.log(`Done. Scanned=${scanned}, Encrypted: tx=${changedTx}, inv=${changedInv}, DRY_RUN=${DRY_RUN}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
})();
