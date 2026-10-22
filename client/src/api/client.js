const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code = body?.error?.code || 'UNKNOWN_ERROR';
    const message = body?.error?.message || 'Something went wrong.';
    throw new ApiError(code, message, res.status);
  }

  return body;
}

export { apiFetch, ApiError };
