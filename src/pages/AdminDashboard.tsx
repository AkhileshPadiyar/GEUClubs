import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection, query, onSnapshot, addDoc, deleteDoc,
  doc, serverTimestamp, orderBy, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Event, Club, AllowedOrganiser } from '../types';
import {
  Plus, Trash2, X, Image as ImageIcon, Check,
  AlertCircle, Users, Calendar, Shield, Edit2
} from 'lucide-react';

interface AdminDashboardProps {
  user: User;
}

type ActiveTab = 'events' | 'clubs' | 'organisers';

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('events');

  // Data
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [organisers, setOrganisers] = useState<AllowedOrganiser[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [isOrganiserModalOpen, setIsOrganiserModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Event form
  const [eventForm, setEventForm] = useState({
    title: '', clubId: '', club: '', date: '', time: '',
    venue: '', description: '', registrationLink: '', posterURL: ''
  });
  const [posterFile, setPosterFile] = useState<File | null>(null);

  // Club form
  const [clubForm, setClubForm] = useState({
    name: '', description: '', logo: ''
  });
  const [clubLogoFile, setClubLogoFile] = useState<File | null>(null);

  // Organiser form
  const [organiserForm, setOrganiserForm] = useState({
    email: '', clubId: ''
  });

  // ── Data fetching ──────────────────────────────────────────────
  useEffect(() => {
    const unsubClubs = onSnapshot(
      query(collection(db, 'clubs'), orderBy('name')),
      (snap) => setClubs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Club)))
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), orderBy('date', 'asc')),
      (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
        setLoading(false);
      }
    );

    const unsubOrganisers = onSnapshot(
      collection(db, 'allowedOrganizers'),
      (snap) => setOrganisers(snap.docs.map(d => ({ email: d.id, ...d.data() } as AllowedOrganiser)))
    );

    return () => { unsubClubs(); unsubEvents(); unsubOrganisers(); };
  }, []);

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // ── Event handlers ─────────────────────────────────────────────
  const openEventModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title, clubId: event.clubId, club: event.club,
        date: event.date, time: event.time, venue: event.venue,
        description: event.description || '',
        registrationLink: event.registrationLink || '',
        posterURL: event.posterURL || ''
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        title: '', clubId: clubs[0]?.id || '', club: clubs[0]?.name || '',
        date: '', time: '', venue: '', description: '', registrationLink: '', posterURL: ''
      });
    }
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      let finalPosterURL = eventForm.posterURL;
      if (posterFile) {
        const storageRef = ref(storage, `posters/admin/${Date.now()}_${posterFile.name}`);
        const result = await uploadBytes(storageRef, posterFile);
        finalPosterURL = await getDownloadURL(result.ref);
      }

      const selectedClub = clubs.find(c => c.id === eventForm.clubId);
      const data = {
        ...eventForm,
        club: selectedClub?.name || eventForm.club,
        posterURL: finalPosterURL,
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingEvent) {
        await deleteDoc(doc(db, 'events', editingEvent.id));
        await addDoc(collection(db, 'events'), { ...data, createdAt: serverTimestamp() });
        showMessage('success', 'Event updated successfully!');
      } else {
        await addDoc(collection(db, 'events'), { ...data, createdAt: serverTimestamp() });
        showMessage('success', 'Event created successfully!');
      }

      setIsEventModalOpen(false);
      setEditingEvent(null);
      setPosterFile(null);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to save event.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    await deleteDoc(doc(db, 'events', id));
  };

  // ── Club handlers ──────────────────────────────────────────────
  const handleClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      let logoURL = clubForm.logo;
      if (clubLogoFile) {
        const storageRef = ref(storage, `logos/${Date.now()}_${clubLogoFile.name}`);
        const result = await uploadBytes(storageRef, clubLogoFile);
        logoURL = await getDownloadURL(result.ref);
      }

      await addDoc(collection(db, 'clubs'), {
        name: clubForm.name.trim(),
        description: clubForm.description.trim(),
        logo: logoURL,
        createdAt: serverTimestamp()
      });

      showMessage('success', `Club "${clubForm.name}" created!`);
      setClubForm({ name: '', description: '', logo: '' });
      setClubLogoFile(null);
      setIsClubModalOpen(false);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to create club.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!window.confirm('Delete this club? All events linked to it will lose their club reference.')) return;
    await deleteDoc(doc(db, 'clubs', id));
  };

  // ── Organiser handlers ─────────────────────────────────────────
  const handleOrganiserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const email = organiserForm.email.toLowerCase().trim();
      const selectedClub = clubs.find(c => c.id === organiserForm.clubId);
      if (!selectedClub) {
        showMessage('error', 'Please select a club.');
        return;
      }

      // Document ID is the email — makes lookup O(1) and prevents duplicates
      await setDoc(doc(db, 'allowedOrganizers', email), {
        email,
        clubId: selectedClub.id,
        clubName: selectedClub.name,
        addedAt: serverTimestamp()
      });

      showMessage('success', `${email} authorised for ${selectedClub.name}`);
      setOrganiserForm({ email: '', clubId: '' });
      setIsOrganiserModalOpen(false);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Failed to add organiser.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteOrganiser = async (email: string) => {
    if (!window.confirm(`Remove access for ${email}?`)) return;
    await deleteDoc(doc(db, 'allowedOrganizers', email));
  };

  // ── Render ─────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'events', label: 'Events', icon: <Calendar className="h-4 w-4" />, count: events.length },
    { id: 'clubs', label: 'Clubs', icon: <Users className="h-4 w-4" />, count: clubs.length },
    { id: 'organisers', label: 'Organisers', icon: <Shield className="h-4 w-4" />, count: organisers.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Admin Panel</h1>
          <p className="text-stone-500 text-sm mt-1">Logged in as <span className="font-semibold text-emerald-600">{user.email}</span></p>
        </div>
        {activeTab === 'events' && (
          <button onClick={() => openEventModal()}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-100">
            <Plus className="h-4 w-4" /> Create Event
          </button>
        )}
        {activeTab === 'clubs' && (
          <button onClick={() => setIsClubModalOpen(true)}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-100">
            <Plus className="h-4 w-4" /> Add Club
          </button>
        )}
        {activeTab === 'organisers' && (
          <button onClick={() => setIsOrganiserModalOpen(true)}
            disabled={clubs.length === 0}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title={clubs.length === 0 ? 'Create a club first before adding organisers' : ''}>
            <Plus className="h-4 w-4" /> Add Organiser
          </button>
        )}
      </div>

      {/* Global message */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.type === 'success' ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {tab.icon}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── EVENTS TAB ── */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          {events.length === 0 ? (
            <div className="p-16 text-center text-stone-400">No events yet. Create one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 text-stone-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">Club</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Venue</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                            <img src={event.posterURL || `https://picsum.photos/seed/${event.id}/100`} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <p className="font-semibold text-stone-900 text-sm">{event.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-medium">{event.club}</td>
                      <td className="px-6 py-4 text-sm text-stone-600">{event.date}</td>
                      <td className="px-6 py-4 text-sm text-stone-500 max-w-[160px] truncate">{event.venue}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEventModal(event)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CLUBS TAB ── */}
      {activeTab === 'clubs' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          {clubs.length === 0 ? (
            <div className="p-16 text-center text-stone-400">No clubs yet. Add one above.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {clubs.map(club => (
                <div key={club.id} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                      {club.logo
                        ? <img src={club.logo} alt={club.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        : <Users className="h-5 w-5 text-stone-400" />
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">{club.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{club.description || 'No description'}</p>
                      <p className="text-xs text-stone-300 font-mono mt-0.5">ID: {club.id}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteClub(club.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete club">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ORGANISERS TAB ── */}
      {activeTab === 'organisers' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
          {clubs.length === 0 && (
            <div className="m-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
              You need to create at least one club before you can add organisers.
            </div>
          )}
          {organisers.length === 0 ? (
            <div className="p-16 text-center text-stone-400">No authorised organisers yet.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {organisers.map(org => (
                <div key={org.email} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors">
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">{org.email}</p>
                    <span className="inline-block mt-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                      {org.clubName}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteOrganiser(org.email)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Remove access">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ CREATE / EDIT EVENT MODAL ══════════════════════════════ */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-stone-900">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); setPosterFile(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleEventSubmit} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Event Title</label>
                  <input type="text" required placeholder="e.g. Annual Tech Hackathon"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Club</label>
                  {clubs.length === 0 ? (
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl py-3 px-4 text-sm text-amber-700">
                      No clubs exist yet. Go to the Clubs tab and create one first.
                    </div>
                  ) : (
                    <select required
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                      value={eventForm.clubId}
                      onChange={e => {
                        const club = clubs.find(c => c.id === e.target.value);
                        setEventForm({ ...eventForm, clubId: e.target.value, club: club?.name || '' });
                      }}>
                      <option value="">Select a club</option>
                      {clubs.map(club => (
                        <option key={club.id} value={club.id}>{club.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Date</label>
                  <input type="date" required
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Time</label>
                  <input type="text" required placeholder="e.g. 10:00 AM – 4:00 PM"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Venue</label>
                  <input type="text" required placeholder="e.g. Seminar Hall 1, CS Block"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Description</label>
                  <textarea rows={3} placeholder="What is this event about?"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Registration Link</label>
                  <input type="url" placeholder="https://forms.gle/..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    value={eventForm.registrationLink} onChange={e => setEventForm({ ...eventForm, registrationLink: e.target.value })} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">Event Poster</label>
                  <div className="flex items-center gap-4">
                    <div className="flex-grow">
                      <input type="file" accept="image/*" className="hidden" id="poster-upload"
                        onChange={e => setPosterFile(e.target.files?.[0] || null)} />
                      <label htmlFor="poster-upload"
                        className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-xl py-5 px-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                        <div className="text-center">
                          <ImageIcon className="h-7 w-7 text-stone-300 group-hover:text-emerald-500 mx-auto mb-1" />
                          <p className="text-sm text-stone-400">{posterFile ? posterFile.name : 'Click to upload poster'}</p>
                        </div>
                      </label>
                    </div>
                    {(posterFile || eventForm.posterURL) && (
                      <div className="h-20 w-20 rounded-xl border border-stone-200 overflow-hidden shrink-0">
                        <img src={posterFile ? URL.createObjectURL(posterFile) : eventForm.posterURL} alt="Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsEventModalOpen(false); setEditingEvent(null); setPosterFile(null); }}
                  className="px-5 py-2.5 text-stone-500 font-semibold hover:text-stone-900 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm">
                  {formLoading ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADD CLUB MODAL ═════════════════════════════════════════ */}
      {isClubModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">Add New Club</h3>
              <button onClick={() => setIsClubModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleClubSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Club Name</label>
                <input type="text" required placeholder="e.g. Coding Club"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={clubForm.name} onChange={e => setClubForm({ ...clubForm, name: e.target.value })} />
                <p className="text-xs text-stone-400 mt-1">Use the exact official name — this is what will appear everywhere on the site.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Description</label>
                <textarea rows={3} placeholder="What does this club do?"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={clubForm.description} onChange={e => setClubForm({ ...clubForm, description: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Club Logo</label>
                <input type="file" accept="image/*" className="hidden" id="logo-upload"
                  onChange={e => setClubLogoFile(e.target.files?.[0] || null)} />
                <label htmlFor="logo-upload"
                  className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-xl py-4 px-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                  <div className="text-center">
                    <ImageIcon className="h-6 w-6 text-stone-300 group-hover:text-emerald-500 mx-auto mb-1" />
                    <p className="text-sm text-stone-400">{clubLogoFile ? clubLogoFile.name : 'Upload logo (optional)'}</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsClubModalOpen(false)}
                  className="px-5 py-2.5 text-stone-500 font-semibold hover:text-stone-900 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm">
                  {formLoading ? 'Creating...' : 'Create Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADD ORGANISER MODAL ════════════════════════════════════ */}
      {isOrganiserModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">Add Authorised Organiser</h3>
              <button onClick={() => setIsOrganiserModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleOrganiserSubmit} className="p-6 space-y-5">

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Club</label>
                <select required
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={organiserForm.clubId}
                  onChange={e => setOrganiserForm({ ...organiserForm, clubId: e.target.value })}>
                  <option value="">Select club</option>
                  {clubs.map(club => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                <p className="text-xs text-stone-400 mt-1">Club doesn't exist? Create it in the Clubs tab first.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Organiser Email</label>
                <input type="email" required placeholder="organiser@geu.ac.in"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  value={organiserForm.email} onChange={e => setOrganiserForm({ ...organiserForm, email: e.target.value })} />
                <p className="text-xs text-stone-400 mt-1">Must match exactly the email they use to log in.</p>
              </div>

              <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 text-xs text-stone-500">
                Once added, this person can log in and post events <strong>only for the selected club</strong>. They cannot post under any other club.
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsOrganiserModalOpen(false)}
                  className="px-5 py-2.5 text-stone-500 font-semibold hover:text-stone-900 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm">
                  {formLoading ? 'Adding...' : 'Authorise Organiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}