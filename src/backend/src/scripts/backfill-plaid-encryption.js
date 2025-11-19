const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../src/backend/.env'), // adjust if yours differs
});
const mongoose = require('mongoose');
const User = require('../models/User.js'); // your schema with ...Enc + virtuals

const SELECT_PLAID_ENC = [
  '+plaidAccessTokenEnc',
  '+plaidItemIdEnc',
  '+plaidCursorEnc',
  '+plaidTransactionsEnc',
  '+plaidInvestmentsEnc',
].join(' ');

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Missing MONGODB_URI / MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(uri, {});

  const coll = mongoose.connection.db.collection('users');

  // Project only legacy plaintext fields + _id; they may or may not exist.
  const projection = {
    _id: 1,
    plaidAccessToken: 1,
    plaidItemId: 1,
    plaidCursor: 1,
    plaidTransactions: 1,
    plaidInvestments: 1,
  };

  const cursor = coll.find({}, { projection }).batchSize(200);

  let scanned = 0;
  let updated = 0;
  let unsetCount = 0;
  let skipped = 0;
  const start = Date.now();

  while (await cursor.hasNext()) {
    const raw = await cursor.next();
    scanned++;

    const hasLegacyString =
      typeof raw.plaidAccessToken === 'string' ||
      typeof raw.plaidItemId === 'string' ||
      typeof raw.plaidCursor === 'string';

    const hasLegacyArrays =
      Array.isArray(raw.plaidTransactions) ||
      Array.isArray(raw.plaidInvestments);

    if (!hasLegacyString && !hasLegacyArrays) {
      skipped++;
      continue;
    }

    // Load mongoose doc with blob fields selected so virtuals can decrypt/encrypt.
    const doc = await User.findById(raw._id).select(SELECT_PLAID_ENC);
    if (!doc) {
      console.warn(`⚠️  User not found for _id=${raw._id}`);
      continue;
    }

    let dirty = false;

    // Only set virtuals when Enc is missing (to keep idempotency and avoid double-encrypt).
    const hasTokenBlob = !!doc.plaidAccessTokenEnc;
    const hasItemBlob = !!doc.plaidItemIdEnc;
    const hasCursorBlob = !!doc.plaidCursorEnc;
    const hasTxBlob = !!doc.plaidTransactionsEnc;
    const hasInvBlob = !!doc.plaidInvestmentsEnc;

    if (typeof raw.plaidAccessToken === 'string' && !hasTokenBlob) {
      doc.plaidAccessToken = raw.plaidAccessToken; // virtual -> encrypts
      dirty = true;
    }
    if (typeof raw.plaidItemId === 'string' && !hasItemBlob) {
      doc.plaidItemId = raw.plaidItemId; // virtual -> encrypts
      dirty = true;
    }
    if (typeof raw.plaidCursor === 'string' && !hasCursorBlob) {
      doc.plaidCursor = raw.plaidCursor; // virtual -> encrypts
      dirty = true;
    }
    if (Array.isArray(raw.plaidTransactions) && !hasTxBlob) {
      doc.plaidTransactions = raw.plaidTransactions; // virtual -> encrypts
      dirty = true;
    }
    if (Array.isArray(raw.plaidInvestments) && !hasInvBlob) {
      doc.plaidInvestments = raw.plaidInvestments; // virtual -> encrypts
      dirty = true;
    }

    if (dirty && !DRY_RUN) {
      await doc.save({ validateBeforeSave: false });
      updated++;
    }

    // Unset legacy plaintext fields if they exist
    const unsetSpec = {};
    if (raw.hasOwnProperty('plaidAccessToken')) unsetSpec.plaidAccessToken = 1;
    if (raw.hasOwnProperty('plaidItemId')) unsetSpec.plaidItemId = 1;
    if (raw.hasOwnProperty('plaidCursor')) unsetSpec.plaidCursor = 1;
    if (raw.hasOwnProperty('plaidTransactions')) unsetSpec.plaidTransactions = 1;
    if (raw.hasOwnProperty('plaidInvestments')) unsetSpec.plaidInvestments = 1;

    const needUnset = Object.keys(unsetSpec).length > 0;

    if (needUnset && !DRY_RUN) {
      await coll.updateOne({ _id: raw._id }, { $unset: unsetSpec });
      unsetCount++;
    }
  }

  const ms = Date.now() - start;
  console.log('--- Backfill summary ---');
  console.log(`Scanned:   ${scanned}`);
  console.log(`Updated:   ${updated}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`Unset old: ${unsetCount}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Elapsed:   ${ms} ms`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('❌ Backfill error:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});