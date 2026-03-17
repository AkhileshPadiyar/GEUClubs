import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Layout, LogOut, User as UserIcon, Calendar, Menu, X } from 'lucide-react';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo + Desktop Links */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-emerald-600 p-1.5 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-stone-900">GEUClubs</span>
            </Link>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link to="/" className="text-stone-600 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">Events</Link>
              <Link to="/clubs" className="text-stone-600 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">Clubs</Link>
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden sm:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1 text-stone-600 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  <Layout className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-stone-600 hover:text-red-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Club Login
              </Link>
            )}
          </div>

          {/* Mobile: right side — avatar or login + hamburger */}
          <div className="flex sm:hidden items-center space-x-2">
            {user ? (
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="h-4 w-4 text-emerald-600" />
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-stone-100 bg-white shadow-lg">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-3 rounded-xl text-stone-700 hover:bg-stone-50 hover:text-emerald-600 text-sm font-medium transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Events</span>
            </Link>
            <Link
              to="/clubs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-3 rounded-xl text-stone-700 hover:bg-stone-50 hover:text-emerald-600 text-sm font-medium transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              <span>Clubs</span>
            </Link>
            {user && (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-xl text-stone-700 hover:bg-stone-50 hover:text-emerald-600 text-sm font-medium transition-colors"
                >
                  <Layout className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-stone-700 hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}