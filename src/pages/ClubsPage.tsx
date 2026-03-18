import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Club } from '../types';
import { Users, ChevronRight } from 'lucide-react';

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">College Clubs</h1>
        <p className="text-stone-600">Explore the various student-led organizations at GEU. Click on a club to see their upcoming events.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-stone-100"></div>
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
          <div className="bg-stone-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-stone-300" />
          </div>
          <h3 className="text-lg font-semibold text-stone-900">No clubs registered yet</h3>
          <p className="text-stone-500 mt-1">Clubs will appear here once they're added to the platform.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map(club => (
            <Link 
              key={club.id} 
              to={`/clubs/${club.id}`}
              className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-xl bg-stone-50 flex items-center justify-center border border-stone-100 group-hover:bg-emerald-50 transition-colors">
                  {club.logo ? (
                    <img src={club.logo} alt={club.name} className="h-12 w-12 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Users className="h-8 w-8 text-stone-300 group-hover:text-emerald-500 transition-colors" />
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-stone-900 group-hover:text-emerald-600 transition-colors">{club.name}</h3>
                  <p className="text-sm text-stone-500 line-clamp-1">{club.description || 'Student-led club at GEU'}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-emerald-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}