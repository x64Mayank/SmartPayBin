import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SparklesIcon, TrashIcon, ArrowRightOnRectangleIcon, UserCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { logoutCall } from '../services/api';
import { logout } from '../features/authSlice';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutCall();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      dispatch(logout());
      navigate('/');
    }
  };

  if (!user) {
    return null; // or redirect, handled by ProtectedRoute in App.jsx
  }

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header */}
      <div className="flex justify-between items-center py-4 mb-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-12 h-12 shadow-md">
              <span className="text-xl">{user.fullName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-base-content/60 font-medium">Welcome back,</p>
            <h2 className="text-lg font-bold leading-none">{user.fullName}</h2>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-circle">
          <ArrowRightOnRectangleIcon className="w-6 h-6 text-base-content/70" />
        </button>
      </div>

      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-[32px] p-6 text-white shadow-xl shadow-primary/20 mb-8 relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <p className="font-medium text-white/80 flex items-center gap-2 mb-1">
          <SparklesIcon className="w-5 h-5 text-yellow-300" /> Total Rewards
        </p>
        <h1 className="text-5xl font-extrabold mb-1">
          {user.totalRewards?.toLocaleString() || 0} <span className="text-xl font-medium text-white/80">pts</span>
        </h1>
        <p className="text-sm font-light text-white/80">Keep recycling to earn more!</p>
      </div>

      <h3 className="font-bold text-lg mb-4 text-base-content/90">Quick Action</h3>
      
      {/* Start Deposit Button */}
      <div 
        onClick={() => navigate('/deposit')}
        className="bg-primary hover:bg-primary/90 cursor-pointer p-4 rounded-3xl text-white shadow-xl shadow-primary/30 mb-8 flex items-center justify-between transition-transform active:scale-95"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <QrCodeIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Start Deposit</h3>
            <p className="text-white/80 text-sm">Scan a bin to earn points</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>

      <h3 className="font-bold text-lg mb-4 text-base-content/90">Your Contributions</h3>
      
      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-base-200/50 p-5 rounded-3xl border border-base-200">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center mb-3">
            <TrashIcon className="w-5 h-5 text-success" />
          </div>
          <p className="text-base-content/60 text-xs font-medium mb-1">Waste Deposited</p>
          <h4 className="text-xl font-bold">{user.totalWasteDepositedInKg || 0} kg</h4>
        </div>
        
        <div className="bg-base-200/50 p-5 rounded-3xl border border-base-200 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center mb-3">
                <UserCircleIcon className="w-5 h-5 text-info" />
            </div>
            <div>
                <p className="text-base-content/60 text-xs font-medium mb-1">Account</p>
                <h4 className="text-sm font-bold truncate">@{user.username}</h4>
            </div>
        </div>
      </div>
      
      {/* Recent Activity Placeholder */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-base-content/90">Recent Activity</h3>
            <span className="text-xs text-primary font-medium cursor-pointer">View All</span>
        </div>
        
        {/* Placeholder for future activity logs list */}
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <TrashIcon className="w-5 h-5 text-success" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">Deposited Waste</p>
                        <p className="text-xs text-base-content/60">System mapped data</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-sm text-success">+{user.totalWasteDepositedInKg || 0} kg</p>
                </div>
            </div>
            
            <div className="text-center mt-6">
                <p className="text-xs text-base-content/50 italic">Activity syncs on next deposit</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
