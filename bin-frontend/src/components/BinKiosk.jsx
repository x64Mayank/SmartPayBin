import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getActiveSessionCall, BIN_ID } from '../services/api';
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const WASTE_ICONS = {
  recyclable: '♻️',
  plastic: '🧴',
  biodegradable: '🌿',
  mixed: '🗑️',
};

const BinKiosk = () => {
  // Phase: idle | pending | active | completed
  const [phase, setPhase] = useState('idle');
  const [session, setSession] = useState(null);
  const pollRef = useRef(null);

  // ── Poll for session status ──
  const pollSession = useCallback(async () => {
    try {
      const data = await getActiveSessionCall();
      const s = data.data?.session;

      if (!s) {
        // No session — go idle
        if (phase !== 'idle') setPhase('idle');
        setSession(null);
        return;
      }

      setSession(s);

      switch (s.status) {
        case 'pending':
          setPhase('pending');
          break;
        case 'active':
          setPhase('active');
          break;
        case 'completed':
          setPhase('completed');
          break;
        default:
          setPhase('idle');
      }
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  }, [phase]);

  useEffect(() => {
    pollSession(); // immediate
    pollRef.current = setInterval(pollSession, 2000); // poll every 2s
    return () => clearInterval(pollRef.current);
  }, [pollSession]);

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center p-6">

      {/* ─── IDLE: Waiting for user ─── */}
      {phase === 'idle' && (
        <div className="text-center max-w-lg animate-fade-in">
          <div className="mb-8 relative">
            <div className="w-48 h-48 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center border-2 border-primary/30 relative">
              <div className="absolute inset-0 border-2 border-primary/20 rounded-3xl animate-ping opacity-30"></div>
              <QrCodeIcon className="w-24 h-24 text-primary" />
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-base-content mb-3">SmartPayBin</h1>
          <p className="text-xl text-base-content/60 mb-6">
            Scan the QR code with the SmartPayBin app to begin your deposit
          </p>

          <div className="bg-base-200 rounded-2xl p-4 inline-block">
            <p className="text-xs text-base-content/40 uppercase tracking-widest font-bold mb-1">Bin ID</p>
            <p className="font-mono text-sm text-primary select-all">{BIN_ID}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <ArrowPathIcon className="w-4 h-4 text-success animate-spin" />
            <span className="text-xs text-base-content/40 uppercase tracking-widest font-semibold">
              Listening for sessions...
            </span>
          </div>
        </div>
      )}

      {/* ─── PENDING: User scanned, waiting for pi-agent to ack ─── */}
      {phase === 'pending' && (
        <div className="text-center max-w-lg">
          <div className="w-32 h-32 mx-auto bg-warning/20 rounded-full flex items-center justify-center mb-6">
            <span className="loading loading-spinner loading-lg text-warning"></span>
          </div>
          <h2 className="text-3xl font-extrabold mb-2">User Detected!</h2>
          <p className="text-base-content/60 text-lg mb-4">
            Connecting to waste detection system...
          </p>
          {session?.userId?.fullName && (
            <div className="badge badge-primary badge-lg font-semibold">
              👤 {session.userId.fullName}
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVE: pi-agent is processing the waste ─── */}
      {phase === 'active' && (
        <div className="text-center max-w-lg">
          <div className="w-32 h-32 mx-auto bg-success/20 rounded-full flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 border-4 border-success/30 rounded-full animate-ping opacity-30"></div>
            <CpuChipIcon className="w-16 h-16 text-success animate-pulse" />
          </div>

          <h2 className="text-3xl font-extrabold text-success mb-2">Lid Unlocked</h2>
          <p className="text-xl text-base-content/60 mb-6">
            Please insert your waste into the bin
          </p>

          {session?.userId?.fullName && (
            <p className="text-sm text-primary font-semibold mb-6">
              User: {session.userId.fullName}
            </p>
          )}

          <div className="bg-base-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3 text-left">
              <span className="loading loading-dots loading-sm text-success"></span>
              <span className="text-base-content/70">Detecting waste type...</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="loading loading-dots loading-sm text-success"></span>
              <span className="text-base-content/70">Measuring weight...</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="loading loading-dots loading-sm text-success"></span>
              <span className="text-base-content/70">Sorting into correct bin...</span>
            </div>
          </div>

          <p className="mt-6 text-xs text-base-content/40 uppercase tracking-widest font-semibold">
            Pi-Agent is processing your deposit
          </p>
        </div>
      )}

      {/* ─── COMPLETED: pi-agent finished, show results ─── */}
      {phase === 'completed' && session && (
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
              <p className="font-bold text-2xl">{WASTE_ICONS[session.wasteType] || '🗑️'}</p>
              <p className="font-semibold text-sm capitalize mt-1">{session.wasteType}</p>
            </div>
            <div className="bg-base-200 p-4 rounded-2xl">
              <p className="text-base-content/40 text-xs font-bold uppercase mb-1">Weight</p>
              <p className="font-bold text-lg">{session.weightKg < 0.1 ? `${(session.weightKg * 1000).toFixed(0)}g` : `${session.weightKg} kg`}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
              <p className="text-primary/60 text-xs font-bold uppercase mb-1">Points</p>
              <p className="font-bold text-lg text-primary">+{session.rewardPoints}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-base-content/40 uppercase tracking-widest font-bold">
              Resetting in a few seconds...
            </p>
            <progress className="progress progress-primary w-56 mt-3" value="100" max="100"></progress>
          </div>
        </div>
      )}

    </div>
  );
};

export default BinKiosk;
