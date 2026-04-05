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

// Poll for any pending sessions assigned to this bin
export const getPendingSessionsCall = async () => {
  const response = await binApi.get('/api/bin/pending-sessions');
  return response.data;
};

// Acknowledge and lock the session (bin handshake)
export const acknowledgeSessionCall = async (sessionId) => {
  const response = await binApi.post('/api/bin/ack-session', { sessionId });
  return response.data;
};

// Submit final sensor data + complete the session
export const completeSessionCall = async (sessionId, wasteType, weightKg) => {
  const response = await binApi.post('/api/bin/complete-session', {
    sessionId,
    wasteType,
    weightKg,
  });
  return response.data;
};

export { BIN_ID };
export default binApi;
