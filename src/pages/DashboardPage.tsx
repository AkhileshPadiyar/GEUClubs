import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Event, Club } from '../types';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestore-errors';

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

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
          setMessage({ type: 'error', text: 'Database is offline. Please check your connection or Firebase setup.' });
        }
      }
    };
    testConnection();

    // Fetch user's clubs
    const clubsQuery = query(collection(db, 'clubs'));
    const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clubs');
    });

    // Fetch user's events
    const eventsQuery = query(collection(db, 'events'), where('createdBy', '==', user.uid));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
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
      console.log("Starting event save process...");
      let finalPosterURL = formData.posterURL;

      // Upload poster if selected
      if (posterFile) {
        console.log("Uploading poster file:", posterFile.name);
        try {
          const storageRef = ref(storage, `posters/${user.uid}/${Date.now()}_${posterFile.name}`);
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timed out after 10 seconds')), 10000)
          );

          // Race the upload against the timeout
          const uploadResult = await Promise.race([
            uploadBytes(storageRef, posterFile),
            timeoutPromise
          ]) as any;

          finalPosterURL = await getDownloadURL(uploadResult.ref);
          console.log("Poster uploaded successfully:", finalPosterURL);
        } catch (uploadError: any) {
          console.error("Error uploading poster:", uploadError);
          const errorMsg = uploadError.message?.includes('timed out') 
            ? 'Upload timed out. Saving event without the image file...' 
            : 'Failed to upload poster. Saving event without it...';
          setMessage({ type: 'error', text: errorMsg });
          // We continue saving the event even if the poster fails
        }
      }

      const eventData = {
        ...formData,
        posterURL: finalPosterURL,
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      };

      console.log("Saving event data to Firestore:", eventData);

      if (editingEvent) {
        try {
          await updateDoc(doc(db, 'events', editingEvent.id), eventData);
          console.log("Event updated successfully");
          setMessage({ type: 'success', text: 'Event updated successfully!' });
        } catch (error) {
          console.error("Firestore update error:", error);
          handleFirestoreError(error, OperationType.UPDATE, `events/${editingEvent.id}`);
        }
      } else {
        try {
          const docRef = await addDoc(collection(db, 'events'), {
            ...eventData,
            createdAt: serverTimestamp()
          });
          console.log("Event created successfully with ID:", docRef.id);
          setMessage({ type: 'success', text: 'Event created successfully!' });
        } catch (error) {
          console.error("Firestore create error:", error);
          handleFirestoreError(error, OperationType.CREATE, 'events');
        }
      }

      setTimeout(() => handleCloseModal(), 1500);
    } catch (error: any) {
      console.error("Error in handleSubmit:", error);
      let errorMsg = 'Failed to save event. Please check your permissions.';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) errorMsg = `Database Error: ${parsed.error}`;
      } catch (e) {
        errorMsg = error.message || errorMsg;
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
  };

  const confirmDelete = async () => {
    if (!isDeleting) return;
    try {
      await deleteDoc(doc(db, 'events', isDeleting));
      setIsDeleting(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      handleFirestoreError(error, OperationType.DELETE, `events/${isDeleting}`);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
  };

  const confirmSeedData = async () => {
    setIsSeeding(false);
    setLoading(true);
    try {
      console.log("Seeding sample data...");
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
          title: 'GEU Hackathon 2024', 
          club: 'Coding Club', 
          clubId: clubRefs[0].id,
          date: '2024-04-15', 
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
          date: '2024-04-20', 
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
          date: '2024-05-05', 
          time: '10:00 AM - 04:00 PM', 
          venue: 'Indoor Sports Complex',
          description: 'Watch custom-built robots battle it out for the ultimate title.',
          registrationLink: 'https://forms.gle/samplerobot',
          posterURL: 'https://picsum.photos/seed/bot/800/450'
        }
      ];

      for (const event of sampleEvents) {
        await addDoc(collection(db, 'events'), {
          ...event,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
      }

      setMessage({ type: 'success', text: 'Sample data seeded successfully!' });
    } catch (error) {
      console.error("Error seeding data:", error);
      setMessage({ type: 'error', text: 'Failed to seed data. Check console for details.' });
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

      {/* Deletion Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
            <div className="bg-red-100 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Delete Event?</h3>
            <p className="text-stone-500 mb-8">Are you sure you want to delete this event? This action cannot be undone.</p>
            <div className="flex space-x-4">
              <button 
                onClick={() => setIsDeleting(null)}
                className="flex-1 px-6 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md shadow-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seeding Confirmation Modal */}
      {isSeeding && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
            <div className="bg-emerald-100 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Plus className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">Seed Sample Data?</h3>
            <p className="text-stone-500 mb-8">This will add sample clubs and events to your account for testing purposes.</p>
            <div className="flex space-x-4">
              <button 
                onClick={() => setIsSeeding(false)}
                className="flex-1 px-6 py-3 text-stone-500 font-bold hover:bg-stone-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSeedData}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
                  
                  <div className="space-y-4">
                    {/* URL Input Fallback */}
                    <div>
                      <input 
                        type="url" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                        placeholder="Paste image URL here (faster fallback)..."
                        value={formData.posterURL}
                        onChange={(e) => setFormData({...formData, posterURL: e.target.value})}
                      />
                    </div>

                    <div className="relative mb-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-stone-100"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                        <span className="px-2 bg-white text-stone-400">Or upload file</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex-grow">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          id="poster-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setPosterFile(file);
                            if (file) setFormData({...formData, posterURL: ''}); // Clear URL if file selected
                          }}
                        />
                        <label 
                          htmlFor="poster-upload"
                          className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-xl py-4 px-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                        >
                          <div className="text-center">
                            <ImageIcon className="h-6 w-6 text-stone-300 group-hover:text-emerald-500 mx-auto mb-1" />
                            <p className="text-xs text-stone-500">{posterFile ? posterFile.name : 'Choose file...'}</p>
                          </div>
                        </label>
                      </div>
                      {(posterFile || formData.posterURL) && (
                        <div className="h-20 w-20 rounded-xl border border-stone-200 overflow-hidden flex-shrink-0 bg-stone-50">
                          <img 
                            src={posterFile ? URL.createObjectURL(posterFile) : formData.posterURL} 
                            alt="Preview" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/200';
                            }}
                          />
                        </div>
                      )}
                    </div>
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
