import { apiFetch } from './client';

function register(email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

function login(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

function logout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

function fetchMe() {
  return apiFetch('/auth/me', { method: 'GET' });
}

export { register, login, logout, fetchMe };
