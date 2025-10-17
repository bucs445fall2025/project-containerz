const mongoose = require('mongoose');

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
    plaidTransactions: {
        type: [mongoose.Schema.Types.Mixed],
        select: false,
        default: []
    },
    plaidInvestments: {
        type: [mongoose.Schema.Types.Mixed],
        select: false,
        default: []
    }
},{
    timestamps: true
})

module.exports = mongoose.model('User', UserSchema);
