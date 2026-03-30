import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000', // Update based on backend port
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

// Optionally if the backend adds a get-user endpoint:
// export const getUserProfileCall = async () => {
//   ...
// }

export default api;
