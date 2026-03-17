import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Event, Club } from '../types';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';

interface DashboardPageProps {
  user: User;
}

export default function DashboardPage({ user }: DashboardPageProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    club: '',
    clubId: '',
    date: '',
    time: '',
    venue: '',
    description: '',
    registrationLink: '',
    posterURL: ''
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);

  useEffect(() => {
    // Fetch user's clubs
    const clubsQuery = query(collection(db, 'clubs'));
    const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      
      // If user has no club, we might want to create one for them or handle it
      // For prototype, we'll just let them pick from existing or add a new one
    });

    // Fetch user's events
    const eventsQuery = query(collection(db, 'events'), where('createdBy', '==', user.uid));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
      setLoading(false);
    });

    return () => {
      unsubscribeClubs();
      unsubscribeEvents();
    };
  }, [user.uid]);

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        club: event.club,
        clubId: event.clubId || '',
        date: event.date,
        time: event.time,
        venue: event.venue,
        description: event.description || '',
        registrationLink: event.registrationLink || '',
        posterURL: event.posterURL || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        club: clubs[0]?.name || '',
        clubId: clubs[0]?.id || '',
        date: '',
        time: '',
        venue: '',
        description: '',
        registrationLink: '',
        posterURL: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setPosterFile(null);
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let finalPosterURL = formData.posterURL;

      // Upload poster if selected
      if (posterFile) {
        const storageRef = ref(storage, `posters/${user.uid}/${Date.now()}_${posterFile.name}`);
        const uploadResult = await uploadBytes(storageRef, posterFile);
        finalPosterURL = await getDownloadURL(uploadResult.ref);
      }

      const eventData = {
        ...formData,
        posterURL: finalPosterURL,
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
        setMessage({ type: 'success', text: 'Event updated successfully!' });
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          createdAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: 'Event created successfully!' });
      }

      setTimeout(() => handleCloseModal(), 1500);
    } catch (error: any) {
      console.error("Error saving event:", error);
      setMessage({ type: 'error', text: 'Failed to save event. Please check your permissions.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'events', id));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event.");
      }
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will add sample clubs and events. Continue?')) return;
    setLoading(true);

    // Helper: returns a YYYY-MM-DD date N days from today
    const futureDate = (daysFromNow: number): string => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    try {
      const sampleClubs = [
        { name: 'Coding Club', description: 'The hub for all things programming at GEU.', logo: 'https://picsum.photos/seed/code/200' },
        { name: 'Photography Club', description: 'Capturing moments and creating memories.', logo: 'https://picsum.photos/seed/photo/200' },
        { name: 'Robotics Society', description: 'Building the future, one bot at a time.', logo: 'https://picsum.photos/seed/robot/200' },
        { name: 'Dance & Arts', description: 'Expressing creativity through movement.', logo: 'https://picsum.photos/seed/dance/200' }
      ];

      const clubRefs: any[] = [];
      for (const club of sampleClubs) {
        const docRef = await addDoc(collection(db, 'clubs'), { ...club, ownerUid: user.uid });
        clubRefs.push({ id: docRef.id, name: club.name });
      }

      const sampleEvents = [
        {
          title: 'GEU Hackathon 2025',
          club: 'Coding Club',
          clubId: clubRefs[0].id,
          date: futureDate(7),
          time: '09:00 AM - 09:00 PM',
          venue: 'CS Block, Seminar Hall 1',
          description: 'A 12-hour hackathon to solve real-world problems. Exciting prizes for winners!',
          registrationLink: 'https://forms.gle/samplehackathon',
          posterURL: 'https://picsum.photos/seed/hack/800/450'
        },
        {
          title: 'Lens & Light Workshop',
          club: 'Photography Club',
          clubId: clubRefs[1].id,
          date: futureDate(14),
          time: '02:00 PM - 05:00 PM',
          venue: 'Main Auditorium Garden',
          description: 'Learn the basics of manual photography from industry experts.',
          registrationLink: 'https://forms.gle/samplephoto',
          posterURL: 'https://picsum.photos/seed/lens/800/450'
        },
        {
          title: 'Bot Wars: Battle of GEU',
          club: 'Robotics Society',
          clubId: clubRefs[2].id,
          date: futureDate(21),
          time: '10:00 AM - 04:00 PM',
          venue: 'Indoor Sports Complex',
          description: 'Watch custom-built robots battle it out for the ultimate title.',
          registrationLink: 'https://forms.gle/samplerobot',
          posterURL: 'https://picsum.photos/seed/bot/800/450'
        },
        {
          title: 'Annual Dance Showcase',
          club: 'Dance & Arts',
          clubId: clubRefs[3].id,
          date: futureDate(30),
          time: '05:00 PM - 08:00 PM',
          venue: 'Main Auditorium',
          description: 'A spectacular evening of dance performances by GEU\'s most talented students.',
          registrationLink: 'https://forms.gle/sampledance',
          posterURL: 'https://picsum.photos/seed/dance2/800/450'
        }
      ];

      for (const event of sampleEvents) {
        await addDoc(collection(db, 'events'), {
          ...event,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
      }

      alert('Sample data seeded successfully!');
    } catch (error) {
      console.error("Error seeding data:", error);
      alert('Failed to seed data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Club Dashboard</h1>
          <p className="text-stone-500">Welcome back, {user.displayName || 'Organizer'}</p>
        </div>
        <div className="flex items-center space-x-3">
          {user.email === 'akhileshpadiyar74@gmail.com' && (
            <button 
              onClick={handleSeedData}
              className="text-stone-500 hover:text-emerald-600 text-sm font-medium px-4 py-2 rounded-xl border border-stone-200 hover:border-emerald-200 transition-all"
            >
              Seed Sample Data
            </button>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center justify-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-100">
          <h2 className="text-xl font-bold text-stone-900">Your Managed Events</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 text-stone-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {events.map(event => (
                  <tr key={event.id} className="hover:bg-stone-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                          <img 
                            src={event.posterURL || `https://picsum.photos/seed/${event.id}/100/100`} 
                            alt="" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{event.title}</p>
                          <p className="text-xs text-emerald-600 font-medium">{event.club}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-stone-600">{event.date}</p>
                      <p className="text-xs text-stone-400">{event.time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-stone-600 line-clamp-1">{event.venue}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleOpenModal(event)}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-stone-500 mb-4">You haven't posted any events yet.</p>
            <button 
              onClick={() => handleOpenModal()}
              className="text-emerald-600 font-bold hover:underline"
            >
              Post your first event
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-stone-900">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {message.text && (
                <div className={`p-4 rounded-xl flex items-start ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {message.type === 'success' ? <Check className="h-5 w-5 mr-3 mt-0.5" /> : <AlertCircle className="h-5 w-5 mr-3 mt-0.5" />}
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Event Title</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="e.g. Annual Tech Hackathon 2024"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Club Name</label>
                  <select 
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={formData.clubId}
                    onChange={(e) => {
                      const club = clubs.find(c => c.id === e.target.value);
                      setFormData({...formData, clubId: e.target.value, club: club?.name || ''});
                    }}
                  >
                    <option value="">Select Club</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                    <option value="other">Other (Manual Entry)</option>
                  </select>
                </div>

                {formData.clubId === 'other' && (
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Manual Club Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="Enter club name"
                      value={formData.club}
                      onChange={(e) => setFormData({...formData, club: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Time</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="e.g. 10:00 AM - 4:00 PM"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Venue</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="e.g. Seminar Hall 1, CS Block"
                    value={formData.venue}
                    onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Description</label>
                  <textarea 
                    rows={4}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Tell students what the event is about..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Registration Link (Google Form, etc.)</label>
                  <input 
                    type="url" 
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="https://forms.gle/..."
                    value={formData.registrationLink}
                    onChange={(e) => setFormData({...formData, registrationLink: e.target.value})}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-2 text-stone-900">Event Poster</label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-grow">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        id="poster-upload"
                        onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                      />
                      <label 
                        htmlFor="poster-upload"
                        className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-xl py-6 px-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                      >
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 text-stone-300 group-hover:text-emerald-500 mx-auto mb-2" />
                          <p className="text-sm text-stone-500">{posterFile ? posterFile.name : 'Click to upload poster image'}</p>
                        </div>
                      </label>
                    </div>
                    {(posterFile || formData.posterURL) && (
                      <div className="h-20 w-20 rounded-xl border border-stone-200 overflow-hidden flex-shrink-0">
                        <img 
                          src={posterFile ? URL.createObjectURL(posterFile) : formData.posterURL} 
                          alt="Preview" 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 flex items-center justify-end space-x-4">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 text-stone-500 font-bold hover:text-stone-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}