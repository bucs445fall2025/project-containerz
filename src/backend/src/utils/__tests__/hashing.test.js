jest.mock('bcrypt', () => ({
	hash: jest.fn(async (value, salt) => `hashed(${value})::${salt}`),
	compare: jest.fn(async (value, hashed) => hashed === `hashed(${value})::salt`),
}));

const bcrypt = require('bcrypt');
const { doHash, doHashValidation, hmacProcess } = require('../hashing.js');

describe('hashing utilities', () => {
	describe('doHash', () => {
		// Ensures doHash forwards credentials to bcrypt and returns the hashed value.
		it('delegates to bcrypt.hash with provided arguments', async () => {
			const result = await doHash('password', 'salt');
			expect(bcrypt.hash).toHaveBeenCalledWith('password', 'salt');
			expect(result).toBe('hashed(password)::salt');
		});
	});

	describe('doHashValidation', () => {
		// Confirms doHashValidation checks the password using bcrypt.compare.
		it('delegates to bcrypt.compare and returns the comparison result', async () => {
			const ok = await doHashValidation('password', 'hashed(password)::salt');
			expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed(password)::salt');
			expect(ok).toBe(true);
		});
	});

	describe('hmacProcess', () => {
		// Verifies hmacProcess outputs a consistent SHA-256 HMAC string.
		it('produces deterministic HMAC hashes', () => {
			const value = 'verify-me';
			const key = 'secret';
			expect(hmacProcess(value, key)).toMatch(/^[a-f0-9]{64}$/);
			expect(hmacProcess(value, key)).toBe(hmacProcess(value, key));
		});
	});
});
