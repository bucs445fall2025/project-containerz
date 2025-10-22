const mongoose = require('mongoose');
const { encryptBlob, decryptBlob } = require('../utils/crypto.js');

const EncryptedBlobSchema = new mongoose.Schema({
  keyId: { type: String, required: true },
  iv: { type: String, required: true },
  tag: { type: String, required: true },
  ct: { type: String, required: true },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required!"],
    trim: true,
    minLength: [2, "Name must have at least 2 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required!"],
    trim: true,
    unique: true,
    minLength: [5, "Email must have at least 5 characters"],
    lowercase: true
  },
  password: {
    type: String,
    required: [true, "Password is required!"],
    trim: true,
    select: false
  },
  verified: { type: Boolean, default: false },

  verificationCode: { type: String, select: false },
  verificationCodeValidation: { type: Number, select: false },
  forgotPasswordCode: { type: String, select: false },
  forgotPasswordCodeValidation: { type: Number, select: false },

  // Encrypted-at-rest Plaid fields (blob form)
  plaidAccessTokenEnc: { type: EncryptedBlobSchema, select: false },
  plaidItemIdEnc: { type: EncryptedBlobSchema, select: false },
  plaidCursorEnc: { type: EncryptedBlobSchema, select: false },

  // Encrypted transaction/investment payloads
  plaidTransactionsEnc: { type: EncryptedBlobSchema, select: false },
  plaidInvestmentsEnc: { type: EncryptedBlobSchema, select: false },

}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ---- Virtuals for plaintext access (auto-decrypt on read, auto-encrypt on write)

function safeDecrypt(blob, fallback = null) {
  try {
    if (!blob) return fallback;
    return decryptBlob(blob);
  } catch {
    return fallback;
  }
}

// Strings
UserSchema.virtual('plaidAccessToken')
  .get(function () { return safeDecrypt(this.plaidAccessTokenEnc, null); })
  .set(function (val)   { this.plaidAccessTokenEnc = val == null ? undefined : encryptBlob(String(val)); });

UserSchema.virtual('plaidItemId')
  .get(function () { return safeDecrypt(this.plaidItemIdEnc, null); })
  .set(function (val)   { this.plaidItemIdEnc = val == null ? undefined : encryptBlob(String(val)); });

UserSchema.virtual('plaidCursor')
  .get(function () { return safeDecrypt(this.plaidCursorEnc, null); })
  .set(function (val)   { this.plaidCursorEnc = val == null ? undefined : encryptBlob(String(val)); });

// Arrays/objects
UserSchema.virtual('plaidTransactions')
  .get(function () { return safeDecrypt(this.plaidTransactionsEnc, []); })
  .set(function (val)   { this.plaidTransactionsEnc = encryptBlob(val ?? []); });

UserSchema.virtual('plaidInvestments')
  .get(function () { return safeDecrypt(this.plaidInvestmentsEnc, []); })
  .set(function (val)   { this.plaidInvestmentsEnc = encryptBlob(val ?? []); });

module.exports = mongoose.model('User', UserSchema);
