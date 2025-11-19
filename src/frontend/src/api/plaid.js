import { request } from './auth.js';

export function createLinkToken(token) {
  return request('/plaid/link-token', { method: 'POST', token });
}

export function setAccessToken(token, publicToken) {
  return request('/plaid/set-access-token', {
    method: 'POST',
    token,
    body: { public_token: publicToken }
  });
}

export function fetchAccounts(token) {
  return request('/plaid/accounts', { token });
}

export function fetchTransactions(token) {
  return request('/plaid/transactions', { token });
}

export function fetchInvestments(token) {
  return request('/plaid/investments', { token });
}
