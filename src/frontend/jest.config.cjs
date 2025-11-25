const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg|bmp|webp)$': '<rootDir>/src/test/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-router|react-router-dom)/)'
  ]
};

module.exports = config;

