import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // Crucial for sending httpOnly cookies
});

export const loginCall = async (credentials) => {
  const response = await api.post('/users/login', credentials);
  return response.data;
};

export const registerCall = async (userData) => {
  const response = await api.post('/users/register', userData);
  return response.data;
};

export const logoutCall = async () => {
  const response = await api.post('/users/logout');
  return response.data;
};

export const getCurrentUserCall = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

// Deposit Flow API Calls
export const startDepositSessionCall = async (binId) => {
  const response = await api.post('/api/deposits/start-session', { binId });
  return response.data;
};

export const getSessionStatusCall = async (sessionId) => {
  const response = await api.get(`/api/deposits/session-status/${sessionId}`);
  return response.data;
};

export const cancelSessionCall = async (sessionId) => {
  const response = await api.post(`/api/deposits/cancel-session/${sessionId}`);
  return response.data;
};

export default api;
