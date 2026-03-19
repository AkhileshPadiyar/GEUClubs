import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, Event, AllowedOrganiser } from '../types';
import { User } from 'firebase/auth';
import { isAdmin } from '../config/admins';
import { uploadImage } from '../utils/uploadImage';
import EventCard from '../components/EventCard';
import {
  ArrowLeft, Edit2, X, Image as ImageIcon, Check,
  AlertCircle, Users, Instagram, Mail, Calendar, Facebook, Twitter, Globe
} from 'lucide-react';

interface ClubDetailPageProps {
  user: User | null;
}

export default function ClubDetailPage({ user }: ClubDetailPageProps) {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();

  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Edit form state — name excluded (admin-only, handled in AdminDashboard)
  const [editForm, setEditForm] = useState({
    description: '',
    instagram: '',
    facebook: '',
    twitter: '',
    website: '',
    email: '',
  });
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);

  // ── Fetch club ────────────────────────────────────────────────
  useEffect(() => {
    if (!clubId) return;

    const fetchClub = async () => {
      const snap = await getDoc(doc(db, 'clubs', clubId));
      if (snap.exists()) {
        setClub({ id: snap.id, ...snap.data() } as Club);
      }
      setLoading(false);
    };

    fetchClub();
  }, [clubId]);

  // ── Fetch upcoming events for this club ───────────────────────
  useEffect(() => {
    if (!clubId) return;

    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();

    const q = query(
      collection(db, 'events'),
      where('clubId', '==', clubId),
      where('date', '>=', today),
      orderBy('date', 'asc')
    );

    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
    });

    return () => unsub();
  }, [clubId]);

  // ── Check if current user can edit this club ──────────────────
  useEffect(() => {
    if (!user || !clubId) return;

    const checkEditPermission = async () => {
      // Admin can always edit
      if (isAdmin(user.email)) {
        setCanEdit(true);
        return;
      }
      // Organiser can edit if their allowedOrganizers doc points to this club
      if (user.email) {
        const orgSnap = await getDoc(
          doc(db, 'allowedOrganizers', user.email.toLowerCase().trim())
        );
        if (orgSnap.exists() && orgSnap.data().clubId === clubId) {
          setCanEdit(true);
        }
      }
    };

    checkEditPermission();
  }, [user, clubId]);

  // ── Open edit modal ───────────────────────────────────────────
  const openEditModal = () => {
    if (!club) return;
    setEditForm({
      description: club.description || '',
      instagram: club.instagram || '',
      facebook: club.facebook || '',
      twitter: club.twitter || '',
      website: club.website || '',
      email: club.email || '',
    });
    setNewLogoFile(null);
    setNewBannerFile(null);
    setMessage({ type: '', text: '' });
    setIsEditModalOpen(true);
  };

  // ── Save changes ──────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !club) return;
    setSaveLoading(true);

    try {
      let logoURL = club.logo || '';
      let bannerURL = club.bannerImage || '';

      if (newLogoFile)   logoURL   = await uploadImage(newLogoFile);
      if (newBannerFile) bannerURL = await uploadImage(newBannerFile);

      const updates: Partial<Club> = {
        description: editForm.description.trim(),
        instagram: editForm.instagram.trim(),
        facebook: editForm.facebook.trim(),
        twitter: editForm.twitter.trim(),
        website: editForm.website.trim(),
        email: editForm.email.trim(),
        logo: logoURL,
        bannerImage: bannerURL,
      };

      // Admin can also update the name — but we intentionally exclude it here
      // Name changes happen only from AdminDashboard

      await updateDoc(doc(db, 'clubs', clubId), updates);

      // Refresh local state
      setClub(prev => prev ? { ...prev, ...updates } : prev);
      setMessage({ type: 'success', text: 'Club profile updated!' });
      setTimeout(() => setIsEditModalOpen(false), 1200);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save. Check your permissions.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-stone-900 mb-4">Club not found</h2>
        <Link to="/clubs" className="text-emerald-600 font-semibold hover:underline">Back to all clubs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Back button */}
      <button
        onClick={() => navigate('/clubs')}
        className="flex items-center text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        All Clubs
      </button>

      {/* ── Club Header Card ── */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">

        {/* Banner — fixed height, emerald gradient fallback if no image */}
        <div className="relative h-36 sm:h-48 bg-gradient-to-br from-emerald-800 to-emerald-500 overflow-hidden">
          {club.bannerImage && (
            <img
              src={club.bannerImage}
              alt="Club banner"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Logo + Name + Edit — sits cleanly below the banner, no overlap */}
        <div className="px-5 sm:px-8 pt-5 pb-6">
          <div className="flex items-start justify-between gap-4 mb-5">

            {/* Left: logo + name — logo is shrink-0 so it never compresses */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                {club.logo
                  ? <img src={club.logo} alt={club.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  : <Users className="h-8 w-8 text-stone-300" />
                }
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight break-words">{club.name}</h1>
                <p className="text-stone-400 text-sm mt-0.5">GEU Club</p>
              </div>
            </div>

            {/* Right: edit button — shrink-0 so it never gets pushed out */}
            {canEdit && (
              <button
                onClick={openEditModal}
                className="flex items-center gap-2 bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 border border-stone-200 hover:border-emerald-200 px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-stone-100 mb-5" />

          {/* Social links — only rendered if the organiser has provided them */}
          {(club.instagram || club.facebook || club.twitter || club.website || club.email) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {club.instagram && (
                <a
                  href={club.instagram.startsWith('http') ? club.instagram : `https://instagram.com/${club.instagram.replace('@','')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 border border-stone-100 px-3 py-1.5 rounded-full hover:border-pink-200 hover:text-pink-600 transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  Instagram
                </a>
              )}
              {club.facebook && (
                <a
                  href={club.facebook.startsWith('http') ? club.facebook : `https://facebook.com/${club.facebook}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 border border-stone-100 px-3 py-1.5 rounded-full hover:border-blue-200 hover:text-blue-600 transition-colors"
                >
                  <Facebook className="h-3.5 w-3.5" />
                  Facebook
                </a>
              )}
              {club.twitter && (
                <a
                  href={club.twitter.startsWith('http') ? club.twitter : `https://x.com/${club.twitter.replace('@','')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 border border-stone-100 px-3 py-1.5 rounded-full hover:border-stone-400 hover:text-stone-900 transition-colors"
                >
                  <Twitter className="h-3.5 w-3.5" />
                  Twitter / X
                </a>
              )}
              {club.website && (
                <a
                  href={club.website.startsWith('http') ? club.website : `https://${club.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 border border-stone-100 px-3 py-1.5 rounded-full hover:border-emerald-200 hover:text-emerald-600 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
              {club.email && (
                <a
                  href={`mailto:${club.email}`}
                  className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 border border-stone-100 px-3 py-1.5 rounded-full hover:border-emerald-200 hover:text-emerald-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {club.email}
                </a>
              )}
            </div>
          )}

          {/* Description */}
          {club.description ? (
            <p className="text-stone-600 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {club.description}
            </p>
          ) : (
            canEdit ? (
              <button
                onClick={openEditModal}
                className="text-sm text-emerald-600 hover:underline"
              >
                + Add a description for your club
              </button>
            ) : (
              <p className="text-stone-400 text-sm italic">No description added yet.</p>
            )
          )}
        </div>
      </div>

      {/* ── Upcoming Events ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Upcoming Events
          </h2>
          <span className="text-stone-400 text-sm">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
            <div className="bg-stone-50 h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-stone-300" />
            </div>
            <p className="font-semibold text-stone-700">No upcoming events</p>
            <p className="text-stone-400 text-sm mt-1">Check back soon for upcoming events from {club.name}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* ══ Edit Club Modal ═══════════════════════════════════════ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

            <div className="p-5 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Edit Club Profile</h3>
                <p className="text-xs text-stone-400 mt-0.5">Club name can only be changed by the admin.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-5">

              {message.text && (
                <div className={`p-3 rounded-xl flex items-center gap-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {message.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {message.text}
                </div>
              )}

              {/* Club name — read only */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Club Name <span className="text-stone-400 font-normal">(locked)</span></label>
                <div className="w-full bg-stone-100 border border-stone-200 rounded-xl py-3 px-4 text-stone-400 text-sm cursor-not-allowed">
                  {club.name}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">About the Club</label>
                <textarea
                  rows={4}
                  placeholder="Tell students what your club is about, what you do, events you run..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm resize-none"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>



              {/* Social Links */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-3">Social Links <span className="text-stone-400 font-normal">(leave blank to hide)</span></label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center shrink-0">
                      <Instagram className="h-4 w-4 text-pink-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="@geu_codingclub or full URL"
                      className="flex-grow bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                      value={editForm.instagram}
                      onChange={e => setEditForm({ ...editForm, instagram: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <Facebook className="h-4 w-4 text-blue-600" />
                    </div>
                    <input
                      type="text"
                      placeholder="Facebook page URL"
                      className="flex-grow bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                      value={editForm.facebook}
                      onChange={e => setEditForm({ ...editForm, facebook: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                      <Twitter className="h-4 w-4 text-stone-700" />
                    </div>
                    <input
                      type="text"
                      placeholder="@handle or full URL"
                      className="flex-grow bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                      value={editForm.twitter}
                      onChange={e => setEditForm({ ...editForm, twitter: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-emerald-600" />
                    </div>
                    <input
                      type="text"
                      placeholder="https://yourclub.com"
                      className="flex-grow bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                      value={editForm.website}
                      onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-stone-500" />
                    </div>
                    <input
                      type="email"
                      placeholder="club@geu.ac.in"
                      className="flex-grow bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Club Logo</label>
                <div className="flex items-center gap-3">
                  <div className="flex-grow">
                    <input type="file" accept="image/*" className="hidden" id="logo-upload"
                      onChange={e => setNewLogoFile(e.target.files?.[0] || null)} />
                    <label htmlFor="logo-upload"
                      className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-xl py-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                      <div className="text-center">
                        <ImageIcon className="h-5 w-5 text-stone-300 group-hover:text-emerald-500 mx-auto mb-1" />
                        <p className="text-xs text-stone-400">{newLogoFile ? newLogoFile.name : 'Upload new logo'}</p>
                      </div>
                    </label>
                  </div>
                  {(newLogoFile || club.logo) && (
                    <div className="h-14 w-14 rounded-xl border border-stone-200 overflow-hidden shrink-0">
                      <img
                        src={newLogoFile ? URL.createObjectURL(newLogoFile) : club.logo}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Banner upload */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Banner Image <span className="text-stone-400 font-normal">(wide header)</span></label>
                <div className="flex items-center gap-3">
                  <div className="flex-grow">
                    <input type="file" accept="image/*" className="hidden" id="banner-upload"
                      onChange={e => setNewBannerFile(e.target.files?.[0] || null)} />
                    <label htmlFor="banner-upload"
                      className="flex items-center justify-center w-full border-2 border-dashed border-stone-200 rounded-xl py-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                      <div className="text-center">
                        <ImageIcon className="h-5 w-5 text-stone-300 group-hover:text-emerald-500 mx-auto mb-1" />
                        <p className="text-xs text-stone-400">{newBannerFile ? newBannerFile.name : 'Upload banner image'}</p>
                      </div>
                    </label>
                  </div>
                  {(newBannerFile || club.bannerImage) && (
                    <div className="h-14 w-24 rounded-xl border border-stone-200 overflow-hidden shrink-0">
                      <img
                        src={newBannerFile ? URL.createObjectURL(newBannerFile) : club.bannerImage}
                        alt="Banner preview"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-stone-500 font-semibold hover:text-stone-900 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saveLoading}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm">
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}