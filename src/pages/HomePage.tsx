import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Event, Club } from '../types';
import EventCard from '../components/EventCard';
import { Search, Filter, Calendar as CalendarIcon } from 'lucide-react';

// Returns today's date as YYYY-MM-DD in local time (avoids UTC shift bug)
function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function HomePage() {
  const { clubId } = useParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState(clubId || 'all');

  useEffect(() => {
    // Sync filter if URL club param changes
    if (clubId) setSelectedClub(clubId);
  }, [clubId]);

  useEffect(() => {
    // Fetch clubs for filter dropdown
    const clubsQuery = query(collection(db, 'clubs'), orderBy('name'));
    const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
    });

    const today = getTodayString();

    // Fetch only upcoming events (today or later), sorted by date
    let eventsQuery = query(
      collection(db, 'events'),
      where('date', '>=', today),
      orderBy('date', 'asc')
    );

    if (selectedClub !== 'all') {
      eventsQuery = query(
        collection(db, 'events'),
        where('clubId', '==', selectedClub),
        where('date', '>=', today),
        orderBy('date', 'asc')
      );
    }

    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      // Secondary sort by createdAt for events on the same date
      eventsData.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return aTime - bTime;
      });
      setEvents(eventsData);
      setLoading(false);
    });

    return () => {
      unsubscribeClubs();
      unsubscribeEvents();
    };
  }, [selectedClub]);

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.club.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-emerald-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Discover Campus Life</h1>
          <p className="text-emerald-100 text-lg mb-8">All GEU college club events in one place. Never miss a hackathon, workshop, or competition again.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
              <input 
                type="text" 
                placeholder="Search events or clubs..." 
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
              <select 
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
              >
                <option value="all" className="text-stone-900">All Clubs</option>
                {clubs.map(club => (
                  <option key={club.id} value={club.id} className="text-stone-900">{club.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 translate-y-1/2 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl"></div>
      </div>

      {/* Events Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-stone-900 flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-emerald-600" />
            Upcoming Events
          </h2>
          <span className="text-stone-500 text-sm">{filteredEvents.length} events found</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-stone-100"></div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event: Event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-200">
            <div className="bg-stone-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-stone-300" />
            </div>
            <h3 className="text-lg font-semibold text-stone-900">No upcoming events found</h3>
            <p className="text-stone-500">
              {searchTerm || selectedClub !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'No events are scheduled yet. Check back soon!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}