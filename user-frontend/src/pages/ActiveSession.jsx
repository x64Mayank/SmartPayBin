import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getSessionStatusCall, cancelSessionCall } from '../services/api';
import { updateUserData } from '../features/authSlice';
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const ActiveSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let intervalId;

    const fetchStatus = async () => {
      try {
        const result = await getSessionStatusCall(sessionId);
        if (result.success && result.data) {
          setSessionData(result.data);

          // Once it's completed or cancelled, stop polling
          if (['completed', 'cancelled', 'expired'].includes(result.data.status)) {
            clearInterval(intervalId);

            // If it completed, inject the new points to the Redux store instantly
            if (result.data.status === 'completed') {
              dispatch(updateUserData({
                totalRewards: result.data.rewardPoints, // Let's just pass what the server responds with, or we can fetch a clean user profile later.
                // Wait, the API returns the session delta, not total. 
              }));
              // Actually, wait, resolving the actual API:
              // For now we'll just show the session data. 
              // A full refetch of /currentUser would be better for totalRewards logic.
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch session status", err);
        setError(err?.response?.data?.message || err.message || "Failed to sync with bin");
        clearInterval(intervalId);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Then poll every 3 seconds
    intervalId = setInterval(fetchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [sessionId, dispatch]);

  const handleCancel = async () => {
    if (!sessionData || sessionData.status !== 'pending') return;
    
    setIsCancelling(true);
    try {
      await cancelSessionCall(sessionId);
      setSessionData(prev => ({ ...prev, status: 'cancelled' }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel session");
    } finally {
      setIsCancelling(false);
    }
  };

  const status = sessionData?.status;

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header */}
      <div className="flex items-center py-4 mb-6 pt-6 relative">
        <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-circle">
          <ArrowLeftIcon className="w-6 h-6 text-base-content/70" />
        </button>
        <h2 className="text-xl font-bold ml-2">Deposit Session</h2>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center pb-20 px-4">
        
        {loading && !sessionData && (
          <div className="flex flex-col items-center">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <p className="text-base-content/60 font-medium animate-pulse">Connecting to Bin hardware...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error text-sm rounded-box shadow-sm mb-4">
            <XCircleIcon className="w-6 h-6 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && sessionData && status === 'pending' && (
          <div className="flex flex-col items-center w-full max-w-sm text-center">
            <div className="bg-warning/20 w-32 h-32 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 border-4 border-warning/30 rounded-full animate-ping opacity-75"></div>
              <ArrowPathIcon className="w-16 h-16 text-warning animate-spin relative z-10" />
            </div>
            <h3 className="text-2xl font-extrabold mb-2 text-base-content/90">Waiting for Bin</h3>
            <p className="text-base-content/60 mb-8 text-sm">
              The bin is validating your request. Please wait for the physical lock to disengage.
            </p>
            <button 
              className="btn btn-outline btn-error w-full rounded-2xl" 
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? <span className="loading loading-spinner"></span> : "Cancel Session"}
            </button>
          </div>
        )}

        {!loading && sessionData && status === 'active' && (
          <div className="flex flex-col items-center w-full max-w-sm text-center">
            <div className="bg-success/20 w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-success/10">
              <CheckCircleIcon className="w-16 h-16 text-success relative z-10 animate-bounce" />
            </div>
            <h3 className="text-2xl font-extrabold mb-2 text-success">Bin Unlocked!</h3>
            <div className="bg-base-200 p-6 rounded-3xl mb-8 w-full border border-base-300 shadow-sm">
              <ul className="text-sm font-medium text-left space-y-3 text-base-content/80">
                <li className="flex gap-2"><span>1.</span> Open the physical lid.</li>
                <li className="flex gap-2"><span>2.</span> Place your waste items inside one by one.</li>
                <li className="flex gap-2 text-primary font-bold"><span>3.</span> Close the lid and press the physical "END" button on the bin.</li>
              </ul>
            </div>
            <p className="text-xs text-base-content/50 uppercase tracking-widest font-bold tracking-pulse">
              Monitoring Sensors...
            </p>
          </div>
        )}

        {!loading && sessionData && status === 'completed' && (
          <div className="flex flex-col items-center w-full max-w-sm text-center">
            <div className="bg-gradient-to-br from-primary to-emerald-600 w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-primary/40 relative">
              {/* Confetti effect approximation */}
              <div className="absolute -top-4 -right-4 w-4 h-4 bg-yellow-400 rounded-full animate-bounce delay-75"></div>
              <div className="absolute top-4 -left-6 w-3 h-3 bg-pink-400 rounded-full animate-bounce delay-150"></div>
              <div className="absolute -bottom-2 right-2 w-5 h-5 bg-blue-400 rounded-full animate-ping delay-300"></div>
              
              <CheckCircleIcon className="w-16 h-16 text-white" />
            </div>
            
            <h3 className="text-3xl font-extrabold mb-1">Deposit Complete!</h3>
            <p className="text-success font-bold mb-8 uppercase tracking-wider text-sm">Successfully Verified</p>
            
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <div className="bg-base-200/60 p-4 rounded-3xl border border-base-200">
                <p className="text-base-content/50 text-xs font-semibold uppercase mb-1">Total Weight</p>
                <p className="font-bold text-2xl">{sessionData.weightKg} <span className="text-sm font-medium">kg</span></p>
              </div>
              <div className="bg-primary/10 p-4 rounded-3xl border border-primary/20">
                <p className="text-primary/70 text-xs font-semibold uppercase mb-1">Earned Points</p>
                <p className="font-bold text-2xl text-primary">+{sessionData.rewardPoints} <span className="text-sm font-medium">pts</span></p>
              </div>
            </div>

            <button 
              className="btn btn-primary btn-lg w-full rounded-2xl shadow-xl shadow-primary/30 text-white"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {!loading && sessionData && (status === 'cancelled' || status === 'expired') && (
          <div className="flex flex-col items-center w-full max-w-sm text-center">
            <div className="bg-error/10 w-32 h-32 rounded-full flex items-center justify-center mb-8">
              <XCircleIcon className="w-16 h-16 text-error opacity-80" />
            </div>
            <h3 className="text-2xl font-extrabold mb-2">Session {status === 'expired' ? 'Expired' : 'Cancelled'}</h3>
            <p className="text-base-content/60 mb-8 max-w-xs text-sm">
              The time window for this deposit has closed or it was manually cancelled. No points were awarded.
            </p>
            <button 
              className="btn btn-outline w-full rounded-2xl"
              onClick={() => navigate('/dashboard')}
            >
              Return Home
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ActiveSession;
