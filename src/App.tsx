/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth } from './firebase';

// Pages
import HomePage from './pages/HomePage';
import ClubsPage from './pages/ClubsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboard from './pages/AdminDashboard';

// Components
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    // Safety timeout — if Firebase doesn't respond in 8 seconds, show a config error
    // instead of spinning forever. Catches missing or wrong firebase config.
    const timeout = setTimeout(() => {
      setConfigError(true);
      setLoading(false);
    }, 8000);

    let unsubscribe: () => void;
    try {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timeout);
        setUser(user);
        setLoading(false);
      }, (error) => {
        // Firebase auth error (e.g. invalid API key)
        console.error('Firebase auth error:', error);
        clearTimeout(timeout);
        setConfigError(true);
        setLoading(false);
      });
    } catch (error) {
      console.error('Firebase init error:', error);
      clearTimeout(timeout);
      setConfigError(true);
      setLoading(false);
    }

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-stone-400 text-sm mt-4">Connecting to GEUClubs...</p>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="bg-white border border-red-100 rounded-3xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="bg-red-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">Firebase Connection Failed</h2>
          <p className="text-stone-500 text-sm mb-4">
            The app couldn't connect to Firebase. This usually means the Firebase config is missing or incorrect.
          </p>
          <div className="bg-stone-50 rounded-xl p-4 text-left text-xs text-stone-500 font-mono border border-stone-100">
            Check that <span className="text-emerald-600">firebase-applet-config.json</span> exists and contains valid Firebase project credentials.
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        <Navbar user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/clubs" element={<ClubsPage />} />
            <Route path="/clubs/:clubId" element={<HomePage />} />
            <Route path="/events/:eventId" element={<EventDetailsPage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/dashboard" element={
                user
                  ? user.email === 'akhileshpadiyar74@gmail.com'
                    ? <AdminDashboard user={user} />
                    : <DashboardPage user={user} />
                  : <Navigate to="/login" />
              } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}