module.exports = {
	rootDir: 'src',
	testMatch: ['**/__tests__/**/*.test.js'],
	testEnvironment: 'node',
	clearMocks: true,
	setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
	collectCoverageFrom: [
		'**/*.js',
		'!**/__tests__/**',
		'!server.js'
	]
};
