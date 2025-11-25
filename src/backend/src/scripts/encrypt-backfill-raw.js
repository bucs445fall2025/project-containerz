// backend/src/scripts/encrypt-backfill-raw.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { encryptBlob } = require('../utils/crypto'); // adjust path if yours differs

const DRY_RUN = process.argv.includes('--dry-run');
const UNSET_PLAINTEXT = true; // remove legacy plaintext field after encrypting

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('MONGODB_URI (or MONGO_URI) missing in env');
if (!process.env.ENCRYPTION_KEY_BASE64) throw new Error('ENCRYPTION_KEY_BASE64 missing in env');

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {});
    const coll = mongoose.connection.db.collection('users');

    // Find docs missing encrypted blobs but with legacy plaintext present
    const cursor = coll.find({
      $or: [
        { 'plaidTransactionsEnc.ct': { $exists: false } },
        { 'plaidInvestmentsEnc.ct':  { $exists: false } },
      ],
      $or: [
        { plaidTransactions: { $type: 'array', $ne: [] } },
        { plaidInvestments:  { $type: 'array', $ne: [] } },
      ],
    }, {
      projection: {
        plaidTransactions: 1,
        plaidTransactionsEnc: 1,
        plaidInvestments: 1,
        plaidInvestmentsEnc: 1,
      }
    });

    let scanned = 0, encTx = 0, encInv = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      scanned++;

      const updates = {};

      // Transactions
      const hasEncTx = doc?.plaidTransactionsEnc?.ct;
      const hasPlainTx = Array.isArray(doc?.plaidTransactions) && doc.plaidTransactions.length > 0;
      if (!hasEncTx && hasPlainTx) {
        const blob = encryptBlob(doc.plaidTransactions);
        updates.plaidTransactionsEnc = blob;
        if (UNSET_PLAINTEXT) updates.plaidTransactions = '';
        encTx++;
      }

      // Investments
      const hasEncInv = doc?.plaidInvestmentsEnc?.ct;
      const hasPlainInv = Array.isArray(doc?.plaidInvestments) && doc.plaidInvestments.length > 0;
      if (!hasEncInv && hasPlainInv) {
        const blob = encryptBlob(doc.plaidInvestments);
        updates.plaidInvestmentsEnc = blob;
        if (UNSET_PLAINTEXT) updates.plaidInvestments = '';
        encInv++;
      }

      if (Object.keys(updates).length === 0) continue;

      if (DRY_RUN) {
        console.log(`[DRY] would update _id=${doc._id} keys=${Object.keys(updates).join(',')}`);
        continue;
      }

      // Build $set / $unset atomically
      const op = {};
      if (updates.plaidTransactionsEnc || updates.plaidInvestmentsEnc) {
        op.$set = {};
        if (updates.plaidTransactionsEnc) op.$set.plaidTransactionsEnc = updates.plaidTransactionsEnc;
        if (updates.plaidInvestmentsEnc)  op.$set.plaidInvestmentsEnc  = updates.plaidInvestmentsEnc;
      }
      if (UNSET_PLAINTEXT && (updates.plaidTransactions === '' || updates.plaidInvestments === '')) {
        op.$unset = {};
        if (updates.plaidTransactions === '') op.$unset.plaidTransactions = 1;
        if (updates.plaidInvestments === '')  op.$unset.plaidInvestments  = 1;
      }

      await coll.updateOne({ _id: doc._id }, op);
    }

    console.log(`Done. Scanned=${scanned}, Encrypted: tx=${encTx}, inv=${encInv}, DRY_RUN=${DRY_RUN}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
})();
