import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getPendingSessionsCall,
  acknowledgeSessionCall,
  completeSessionCall,
  BIN_ID,
} from '../services/api';
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const WASTE_TYPES = [
  { id: 'recyclable', label: 'Recyclable', color: 'btn-info' },
  { id: 'plastic', label: 'Plastic', color: 'btn-warning' },
  { id: 'biodegradable', label: 'Biodegradable', color: 'btn-success' },
  { id: 'mixed', label: 'Mixed', color: 'btn-secondary' },
];

const WEIGHT_PRESETS = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0];

const BinKiosk = () => {
  // State machine: idle | pending | active | completing | completed | error
  const [phase, setPhase] = useState('idle');
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  // Sensor simulation state
  const [selectedWaste, setSelectedWaste] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [completionData, setCompletionData] = useState(null);

  const pollRef = useRef(null);

  // ── IDLE PHASE: Poll for pending sessions ──
  const pollForSessions = useCallback(async () => {
    try {
      const data = await getPendingSessionsCall();
      if (data.success && data.data?.sessions?.length > 0) {
        const incoming = data.data.sessions[0];
        setSession(incoming);
        setPhase('pending');

        // Immediately acknowledge it
        try {
          const ackResult = await acknowledgeSessionCall(incoming._id);
          if (ackResult.success) {
            setSession(prev => ({ ...prev, expiresAt: ackResult.data?.expiresAt }));
            setPhase('active');
          } else {
            setError(ackResult.message || 'Failed to acknowledge session');
            setPhase('error');
          }
        } catch (ackErr) {
          setError(ackErr?.response?.data?.message || 'Handshake failed');
          setPhase('error');
        }
      }
    } catch (err) {
      // Silently ignore poll errors (server might be restarting, etc.)
      console.error('Poll error:', err.message);
    }
  }, []);

  useEffect(() => {
    if (phase === 'idle') {
      // Start polling
      pollForSessions(); // immediate first check
      pollRef.current = setInterval(pollForSessions, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, pollForSessions]);

  // ── ACTIVE PHASE: Complete deposit ──
  const handleCompleteDeposit = async () => {
    if (!selectedWaste || !selectedWeight || !session) return;

    setPhase('completing');
    try {
      const result = await completeSessionCall(session._id, selectedWaste, selectedWeight);
      if (result.success) {
        setCompletionData(result.data);
        setPhase('completed');
      } else {
        setError(result.message || 'Failed to complete deposit');
        setPhase('error');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Completion failed');
      setPhase('error');
    }
  };

  // ── Reset back to idle ──
  const resetToIdle = () => {
    setPhase('idle');
    setSession(null);
    setError(null);
    setSelectedWaste(null);
    setSelectedWeight(null);
    setCompletionData(null);
  };

  // Auto-reset after completed or error
  useEffect(() => {
    let timer;
    if (phase === 'completed') {
      timer = setTimeout(resetToIdle, 8000);
    } else if (phase === 'error') {
      timer = setTimeout(resetToIdle, 5000);
    }
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6">

      {/* ─── IDLE: Waiting for user to scan ─── */}
      {phase === 'idle' && (
        <div className="text-center max-w-lg animate-fade-in">
          <div className="mb-8 relative">
            <div className="w-48 h-48 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center border-2 border-primary/30 relative">
              <div className="absolute inset-0 border-2 border-primary/20 rounded-3xl animate-ping opacity-30"></div>
              <QrCodeIcon className="w-24 h-24 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-base-content mb-3">SmartPayBin</h1>
          <p className="text-xl text-base-content/60 mb-6">Scan the QR code with the SmartPayBin app to begin your deposit</p>

          <div className="bg-base-200 rounded-2xl p-4 inline-block">
            <p className="text-xs text-base-content/40 uppercase tracking-widest font-bold mb-1">Bin ID</p>
            <p className="font-mono text-sm text-primary select-all">{BIN_ID}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <ArrowPathIcon className="w-4 h-4 text-success animate-spin" />
            <span className="text-xs text-base-content/40 uppercase tracking-widest font-semibold">Listening for sessions...</span>
          </div>
        </div>
      )}

      {/* ─── PENDING: Acknowledging ─── */}
      {phase === 'pending' && (
        <div className="text-center max-w-lg">
          <span className="loading loading-spinner loading-lg text-primary mb-6"></span>
          <h2 className="text-3xl font-extrabold mb-2">User Detected!</h2>
          <p className="text-base-content/60 text-lg">Establishing secure handshake...</p>
        </div>
      )}

      {/* ─── ACTIVE: Sensor simulation ─── */}
      {phase === 'active' && (
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircleIcon className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-3xl font-extrabold text-success mb-1">Lid Unlocked</h2>
            <p className="text-base-content/60">Insert your waste items. Select type and weight below when done.</p>
            {session?.userId?.fullName && (
              <p className="text-sm text-primary mt-2 font-semibold">User: {session.userId.fullName}</p>
            )}
          </div>

          {/* Waste Type Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-base-content/50 mb-3">Waste Type (Sensor Simulation)</h3>
            <div className="grid grid-cols-2 gap-3">
              {WASTE_TYPES.map((wt) => (
                <button
                  key={wt.id}
                  className={`btn btn-lg rounded-2xl ${selectedWaste === wt.id ? wt.color + ' text-white shadow-lg scale-105' : 'btn-outline'} transition-all`}
                  onClick={() => setSelectedWaste(wt.id)}
                >
                  {wt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weight Selection */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-base-content/50 mb-3">Weight (kg)</h3>
            <div className="grid grid-cols-3 gap-3">
              {WEIGHT_PRESETS.map((w) => (
                <button
                  key={w}
                  className={`btn btn-lg rounded-2xl font-mono ${selectedWeight === w ? 'btn-primary text-white shadow-lg scale-105' : 'btn-outline'} transition-all`}
                  onClick={() => setSelectedWeight(w)}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>

          {/* Complete Button */}
          <button
            onClick={handleCompleteDeposit}
            disabled={!selectedWaste || !selectedWeight}
            className="btn btn-error btn-lg w-full rounded-2xl text-white text-xl shadow-xl shadow-error/30 disabled:opacity-30"
          >
            <TrashIcon className="w-6 h-6 mr-2" />
            End Deposit &amp; Submit
          </button>
        </div>
      )}

      {/* ─── COMPLETING: Sending data ─── */}
      {phase === 'completing' && (
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-warning mb-6"></span>
          <h2 className="text-3xl font-extrabold mb-2">Processing...</h2>
          <p className="text-base-content/60">Transmitting sensor data to the server</p>
        </div>
      )}

      {/* ─── COMPLETED: Success ─── */}
      {phase === 'completed' && completionData && (
        <div className="text-center max-w-md">
          <div className="w-28 h-28 mx-auto bg-gradient-to-br from-success to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-success/40 relative">
            <div className="absolute -top-3 -right-4 w-5 h-5 bg-yellow-400 rounded-full animate-bounce"></div>
            <div className="absolute top-6 -left-5 w-3 h-3 bg-pink-400 rounded-full animate-bounce delay-100"></div>
            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-blue-400 rounded-full animate-ping delay-200"></div>
            <CheckCircleIcon className="w-14 h-14 text-white" />
          </div>

          <h2 className="text-4xl font-extrabold mb-1">Thank You!</h2>
          <p className="text-success text-lg font-bold uppercase tracking-wider mb-6">Deposit Verified</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-base-200 p-4 rounded-2xl">
              <p className="text-base-content/40 text-xs font-bold uppercase mb-1">Type</p>
              <p className="font-bold text-lg capitalize">{completionData.wasteType}</p>
            </div>
            <div className="bg-base-200 p-4 rounded-2xl">
              <p className="text-base-content/40 text-xs font-bold uppercase mb-1">Weight</p>
              <p className="font-bold text-lg">{completionData.weightKg} kg</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
              <p className="text-primary/60 text-xs font-bold uppercase mb-1">Points</p>
              <p className="font-bold text-lg text-primary">+{completionData.rewardPoints}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-base-content/40 uppercase tracking-widest font-bold">Resetting in a few seconds...</p>
            <progress className="progress progress-primary w-56 mt-3" value="100" max="100"></progress>
          </div>
        </div>
      )}

      {/* ─── ERROR ─── */}
      {phase === 'error' && (
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 mx-auto bg-error/10 rounded-full flex items-center justify-center mb-6">
            <XCircleIcon className="w-14 h-14 text-error" />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Session Error</h2>
          <p className="text-base-content/60 mb-6">{error || 'Something went wrong'}</p>
          <p className="text-xs text-base-content/40 uppercase tracking-widest font-bold">Resetting automatically...</p>
        </div>
      )}

    </div>
  );
};

export default BinKiosk;
