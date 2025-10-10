const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export async function request(path, { method = 'GET', body, token, headers: customHeaders } = {}) {
  const headers = new Headers(customHeaders ?? {});
  const hasBody = body !== undefined && body !== null;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
  });

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data?.message ?? data?.error ?? 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data ?? {};
}

export function signUp(form) {
  return request('/auth/signup', { method: 'POST', body: form });
}

export function signIn(form) {
  return request('/auth/signin', { method: 'POST', body: form });
}

export function getCurrentUser(token) {
  return request('/auth/me', { token });
}

export function signOut(token) {
  return request('/auth/signout', { method: 'POST', token });
}

export function changePassword(token, params = {}) {
  const { oldPassword, newPassword } = params;
  return request('/auth/change-password', {
    method: 'PATCH',
    token,
    body: { oldPassword, newPassword }
  });
}

export function sendForgotPasswordCode(email) {
  return request('/auth/send-forgot-password-code', {
    method: 'PATCH',
    body: { email }
  });
}

export function verifyForgotPasswordCode(params = {}) {
  const { email, code, providedCode, newPassword } = params;
  const normalizedCode = (providedCode ?? code)?.toString().trim();
  return request('/auth/verify-forgot-password-code', {
    method: 'PATCH',
    body: { email, providedCode: normalizedCode, newPassword }
  });
}

export function sendVerificationCode(token, email) {
  return request('/auth/send-verification-code', {
    method: 'PATCH',
    token,
    body: { email }
  });
}

export function verifyVerificationCode(token, params = {}) {
  const { email, code, providedCode } = params;
  const normalizedCode = providedCode ?? code;
  return request('/auth/verify-verification-code', {
    method: 'PATCH',
    token,
    body: { email, providedCode: normalizedCode }
  });
}
