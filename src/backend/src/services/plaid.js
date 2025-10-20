const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const DEFAULT_ENV = 'sandbox';
const REQUIRED_PRODUCTS = ['auth', 'transactions', 'investments'];
const DEFAULT_PRODUCTS = REQUIRED_PRODUCTS;
const DEFAULT_COUNTRY_CODES = ['US'];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getPlaidEnv() {
  const env = process.env.PLAID_ENV?.toLowerCase() ?? DEFAULT_ENV;
  const plaidEnv = PlaidEnvironments[env];
  if (!plaidEnv) {
    const supported = Object.keys(PlaidEnvironments).join(', ');
    throw new Error(`Unsupported PLAID_ENV '${env}'. Supported values: ${supported}`);
  }
  return plaidEnv;
}

function parseEnvList(value, fallback) {
  if (!value) {
    return fallback;
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const configuration = new Configuration({
  basePath: getPlaidEnv(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': getRequiredEnv('PLAID_CLIENT_ID'),
      'PLAID-SECRET': getRequiredEnv('PLAID_SECRET'),
      'Plaid-Version': '2020-09-14'
    }
  }
});

const plaidClient = new PlaidApi(configuration);

function getProducts() {
  const configured = parseEnvList(process.env.PLAID_PRODUCTS, []);
  const merged = new Set([...configured, ...REQUIRED_PRODUCTS]);
  return Array.from(merged);
}

function getCountryCodes() {
  return parseEnvList(process.env.PLAID_COUNTRY_CODES, DEFAULT_COUNTRY_CODES);
}

module.exports = {
  plaidClient,
  getProducts,
  getCountryCodes
};
