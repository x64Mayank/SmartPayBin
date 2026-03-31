import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerCall } from '../services/api';
import { setCredentials } from '../features/authSlice';

const Register = () => {
  const [formData, setFormData] = useState({ fullName: '', username: '', email: '', password: '' });
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

    // Basic Validation JS
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.username.trim() || !formData.password.trim()) {
      setError("All fields are required.");
      return;
    }
    
    if (formData.password.length < 5) {
      setError("Password must be at least 5 characters.");
      return;
    }

    setLoading(true);
    try {
      // Backend create user
      const data = await registerCall({
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });

      if (data.success && data.data) {
        // Technically login is separate, but we can assume the user is returned or we redirect to login
        // Actually, backend register does not log the user in automatically, it just returns created user.
        // We will navigate to login to ask them to log in.
        navigate('/'); // go to login
      } else {
         navigate('/');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100 justify-center px-4 overflow-y-auto no-scrollbar">
      <div className="text-center mb-8 mt-4 pt-10">
        <h1 className="text-4xl font-extrabold text-primary mb-2">SmartPayBin</h1>
        <p className="text-base-content/70">Create a new account and save waste.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto pb-10">
        {error && (
          <div className="alert alert-error text-sm rounded-box shadow-sm mb-2">
            <span>{error}</span>
          </div>
        )}

        <div className="form-control w-full">
          <label className="label pt-0"><span className="label-text font-medium">Full Name</span></label>
          <input type="text" name="fullName" placeholder="John Doe" className="input input-bordered w-full input-lg bg-base-200/50 focus:bg-base-100 placeholder:text-sm" value={formData.fullName} onChange={handleChange} />
        </div>

        <div className="form-control w-full">
          <label className="label pt-0"><span className="label-text font-medium">Username</span></label>
          <input type="text" name="username" placeholder="johndoe123" className="input input-bordered w-full input-lg bg-base-200/50 focus:bg-base-100 placeholder:text-sm" value={formData.username} onChange={handleChange} />
        </div>

        <div className="form-control w-full">
          <label className="label pt-0"><span className="label-text font-medium">Email</span></label>
          <input type="email" name="email" placeholder="johndoe@example.com" className="input input-bordered w-full input-lg bg-base-200/50 focus:bg-base-100 placeholder:text-sm" value={formData.email} onChange={handleChange} />
        </div>

        <div className="form-control w-full">
          <label className="label"><span className="label-text font-medium">Password</span></label>
          <input type="password" name="password" placeholder="••••••••" className="input input-bordered w-full input-lg bg-base-200/50 focus:bg-base-100 placeholder:text-sm" value={formData.password} onChange={handleChange} />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg mt-6 w-full rounded-2xl shadow-xl shadow-primary/30 text-white">
          {loading ? <span className="loading loading-spinner"></span> : "Sign Up"}
        </button>

        <p className="text-center text-sm font-medium mt-6 text-base-content/70">
          Already have an account? <Link to="/" className="text-primary hover:underline">Sign In</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
