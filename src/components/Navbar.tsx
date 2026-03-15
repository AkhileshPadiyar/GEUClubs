import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Layout, LogOut, User as UserIcon, Calendar } from 'lucide-react';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
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
          <div className="flex items-center space-x-4">
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
        </div>
      </div>
    </nav>
  );
}
