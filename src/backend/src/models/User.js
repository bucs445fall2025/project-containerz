const mongoose = require('mongoose');
const { encryptBlob, decryptBlob } = require('../utils/crypto.js');

const EncryptedBlobSchema = new mongoose.Schema({
    keyId: { type: String, required: true },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    ct:  { type: String, required: true },
}, { _id: false });

const UserSchema = mongoose.Schema({
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
        unique: [true , "Email must be unique!"], 
        minLength: [5, "Email must have at least 5 characters"],
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is required!"],
        trim: true,
        select: false 
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationCode: { 
        type: String,
        select: false
    },
    verificationCodeValidation: {
        type: Number,
        select: false
    },
    forgotPasswordCode: {
        type: String,
        select: false
    },
    forgotPasswordCodeValidation: {
        type: Number,
        select: false
    },
    plaidAccessToken: {
        type: String,
        select: false
    },
    plaidItemId: {
        type: String,
        select: false
    },
    plaidCursor: {
        type: String, 
        select: false, 
        default: null 
    },
    plaidTransactionsEnc: { type: EncryptedBlobSchema, select: false },
    plaidInvestmentsEnc: { type: EncryptedBlobSchema, select: false },
},{
    timestamps: true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
});


UserSchema.virtual('plaidTransactions')
  .get(function () { return decryptBlob(this.plaidTransactionsEnc) || []; })
  .set(function (val)   { this.plaidTransactionsEnc = encryptBlob(val ?? []); });

UserSchema.virtual('plaidInvestments')
  .get(function () { return decryptBlob(this.plaidInvestmentsEnc) || []; })
  .set(function (val)   { this.plaidInvestmentsEnc = encryptBlob(val ?? []); });


UserSchema.pre('save', function(next){
    if (this.isModified('plaidTransactionsEnc')) return next();
    next();
});

module.exports = mongoose.model('User', UserSchema);
