// Centralized API utility with auth token management

// In production (same origin), API_URL is empty. In dev (CRA on port 3000), proxy to backend on 3001.
const API_URL = window.location.port === '3000' ? 'http://localhost:3001' : '';

// Token management using sessionStorage (cleared when tab closes)
export const setAuthToken = (token) => {
  sessionStorage.setItem('kapital_auth_token', token);
};

export const getAuthToken = () => {
  return sessionStorage.getItem('kapital_auth_token');
};

export const clearAuthToken = () => {
  sessionStorage.removeItem('kapital_auth_token');
  sessionStorage.removeItem('kapital_user');
};

export const setUser = (user) => {
  sessionStorage.setItem('kapital_user', JSON.stringify(user));
};

export const getUser = () => {
  try {
    const u = sessionStorage.getItem('kapital_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

// Build auth headers
export const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// POST with auth
export const apiPost = async (endpoint, body) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  return response;
};

// GET with auth
export const apiGet = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  return response;
};

export { API_URL };
