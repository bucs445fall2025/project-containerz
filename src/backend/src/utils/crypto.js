const crypto = require('crypto');
const { getKey, currentKeyId } = require('./keyring.js');

// Bind ciphertext to this field/context (prevents mixups)
const AAD = Buffer.from('User.plaidTransactions', 'utf8');

function encryptBlob(plainObj) {
    const keyId = currentKeyId;
    const key = getKey(keyId);
    const iv = crypto.randomBytes(12); // 96-bit IV is recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(AAD);

    const json = Buffer.from(JSON.stringify(plainObj), 'utf8');
    const ct = Buffer.concat([cipher.update(json), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        keyId,
        iv:  iv.toString('base64'),
        tag: tag.toString('base64'),
        ct:  ct.toString('base64'),
    };
}

function decryptBlob(record) {
    if (!record || !record.ct) return null;

    try {
        const key = getKey(record.keyId);
        const iv  = Buffer.from(record.iv,  'base64');
        const tag = Buffer.from(record.tag, 'base64');
        const ct  = Buffer.from(record.ct,  'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(AAD);
        decipher.setAuthTag(tag);

        const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
        return JSON.parse(pt.toString('utf8'));
    } catch {
        // Auth tag/key mismatch => treat as undecryptable
        return null;
    }
}

module.exports = { encryptBlob, decryptBlob };