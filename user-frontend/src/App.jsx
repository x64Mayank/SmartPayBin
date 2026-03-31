import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getCurrentUserCall } from './services/api';
import { setCredentials, logout } from './features/authSlice';
import MobileLayout from './layouts/MobileLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import ActiveSession from './pages/ActiveSession';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await getCurrentUserCall();
        if (data.success && data.data) {
          dispatch(setCredentials({ user: data.data }));
        }
      } catch (err) {
        // Not authenticated, just clear
        dispatch(logout());
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkAuth();
  }, [dispatch]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner text-primary loading-lg"></span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* We use the MobileLayout for all routes to keep the UI consistent */}
        <Route element={<MobileLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/deposit" 
            element={
              <ProtectedRoute>
                <Deposit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/session/:sessionId" 
            element={
              <ProtectedRoute>
                <ActiveSession />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
