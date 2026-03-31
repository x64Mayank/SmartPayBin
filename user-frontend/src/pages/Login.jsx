import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginCall } from '../services/api';
import { setCredentials } from '../features/authSlice';

const Login = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.identifier.trim() || !formData.password.trim()) {
      setError("Username/email and password are required.");
      return;
    }

    setLoading(true);
    try {
      // Backend expects either email or username, we use identifier for both
      const isEmail = formData.identifier.includes('@');
      const payload = {
        password: formData.password,
        ...(isEmail ? { email: formData.identifier } : { username: formData.identifier }),
      };

      const data = await loginCall(payload);
      if (data.success && data.data) {
        dispatch(setCredentials({ user: data.data.user }));
        navigate('/dashboard');
      } else {
        setError("Failed to login.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100 justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-primary mb-2">SmartPayBin</h1>
        <p className="text-base-content/70">Welcome back! Please login to your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm mx-auto">
        {error && (
          <div className="alert alert-error text-sm rounded-box shadow-sm mb-2">
            <span>{error}</span>
          </div>
        )}

        <div className="form-control w-full">
          <label className="label pt-0"><span className="label-text font-medium">Email or Username</span></label>
          <input
            type="text"
            name="identifier"
            placeholder="johndoe@example.com"
            className="input input-bordered w-full input-lg bg-base-200/50 focus:bg-base-100 placeholder:text-sm"
            value={formData.identifier}
            onChange={handleChange}
          />
        </div>

        <div className="form-control w-full">
          <label className="label"><span className="label-text font-medium">Password</span></label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            className="input input-bordered w-full input-lg bg-base-200/50 focus:bg-base-100 placeholder:text-sm"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg mt-6 w-full rounded-2xl shadow-xl shadow-primary/30 text-white">
          {loading ? <span className="loading loading-spinner"></span> : "Sign In"}
        </button>

        <p className="text-center text-sm font-medium mt-6 text-base-content/70">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
