import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // No whitelist check here — anyone can log in.
  // The Dashboard itself checks if the user is an authorised organiser.

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <div className="text-center mb-8">
          <div className="bg-emerald-100 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Club Organizer Login</h1>
          <p className="text-stone-500 mt-2">Manage your club events and reach more students.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="email"
                required
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="club@geu.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="password"
                required
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login with Email'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-100"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-stone-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-stone-200 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
          <span>Login with Google</span>
        </button>

        <p className="text-center text-stone-400 text-xs mt-8">
          Only authorised club organisers can post events. Contact the student council for access.
        </p>
      </div>
    </div>
  );
}