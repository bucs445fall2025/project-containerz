const mongoose = require('mongoose');

const PlaidItemSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
	item_id: { type: String, index: true },
	access_token_enc: { type: String, required: true },
	institution: { type: Object },
	last_cursor: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('PlaidItem', PlaidItemSchema);