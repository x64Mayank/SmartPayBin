import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const BIN_ID = import.meta.env.VITE_BIN_ID;
const BIN_API_KEY = import.meta.env.VITE_BIN_API_KEY;

const binApi = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-bin-id': BIN_ID,
    'x-bin-api-key': BIN_API_KEY,
  },
});

// Poll for current session status (pending → active → completed)
export const getActiveSessionCall = async () => {
  const response = await binApi.get('/api/bin/active-session');
  return response.data;
};

export { BIN_ID };
export default binApi;
