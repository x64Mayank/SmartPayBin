import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startDepositSessionCall } from '../services/api';
import { QrCodeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const Deposit = () => {
  const [binId, setBinId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!binId.trim()) {
      setError("Please enter a valid Bin ID.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await startDepositSessionCall(binId.trim());
      if (data.success && data.data) {
        // Rediect to the active session monitor view
        navigate(`/session/${data.data.sessionId}`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to connect to bin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header */}
      <div className="flex items-center py-4 mb-6 pt-6">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-circle">
          <ArrowLeftIcon className="w-6 h-6 text-base-content/70" />
        </button>
        <h2 className="text-xl font-bold ml-2">Scan Bin</h2>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center pb-20">
        <div className="bg-primary/10 w-32 h-32 rounded-full flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping opacity-75"></div>
          <QrCodeIcon className="w-16 h-16 text-primary relative z-10" />
        </div>

        <h3 className="text-2xl font-extrabold mb-2 text-center text-base-content/90">Connect to a Bin</h3>
        <p className="text-center text-base-content/60 px-6 mb-8 text-sm">
          Since QR scanning is disabled for development, paste the ID of the physical hardware bin to establish a secure session block.
        </p>

        <form onSubmit={handleStartSession} className="w-full px-4 max-w-sm">
          {error && (
            <div className="alert alert-error text-sm rounded-box shadow-sm mb-4">
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-control w-full mb-6">
            <input
              type="text"
              placeholder="Enter Bin ID (e.g. 64abc123...)"
              className="input input-bordered w-full input-lg bg-base-200/50 text-center font-mono placeholder:font-sans placeholder:text-sm"
              value={binId}
              onChange={(e) => setBinId(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary btn-lg w-full rounded-2xl shadow-xl shadow-primary/30 text-white"
          >
            {loading ? <span className="loading loading-spinner"></span> : "Simulate Scan"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Deposit;
