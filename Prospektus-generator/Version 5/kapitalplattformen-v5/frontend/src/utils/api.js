// Smart BASE_URL detection for development vs production
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    // CRA dev server on port 3000 → API on port 3001
    if (port === '3000') {
      return 'http://localhost:3001';
    }
    // In production, same origin
    return '';
  }
  return '';
};

const BASE_URL = getBaseUrl();

// Token management via sessionStorage
export const setAuthToken = (token) => {
  sessionStorage.setItem('auth_token', token);
};

export const getAuthToken = () => {
  return sessionStorage.getItem('auth_token');
};

export const clearAuthToken = () => {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('user');
};

export const setUser = (user) => {
  sessionStorage.setItem('user', JSON.stringify(user));
};

export const getUser = () => {
  try {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

// Auth headers helper
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// POST request with auth
export const apiPost = async (endpoint, data) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  return response;
};

// GET request with auth
export const apiGet = async (endpoint) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  return response;
};

// PUT request with auth
export const apiPut = async (endpoint, data) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Session expired');
  }

  return response;
};
