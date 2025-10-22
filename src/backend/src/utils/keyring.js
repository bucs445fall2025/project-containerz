require('dotenv').config();
const b64 = process.env.ENCRYPTION_KEY_BASE64;
if (!b64) throw new Error("ENCRYPTION_KEY_BASE64 is missing");

const key = Buffer.from(b64, 'base64');
if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY_BASE64 must decode to 32 bytes (AES-256). Got ${key.length}.`);
}

const keys = { v1: key };

function getKey(keyId = 'v1') {
    const k = keys[keyId];
    if (!k) throw new Error(`Unknown keyId: ${keyId}`);
    return k;
}

module.exports = { getKey, currentKeyId: 'v1' };