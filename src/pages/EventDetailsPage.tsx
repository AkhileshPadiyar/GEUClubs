import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Event } from '../types';
import React from "react";
const handleTouch = (e: React.TouchEvent) => {
  console.log(e);
};
import {
  Calendar, MapPin, Clock, ArrowLeft, ExternalLink,
  Share2, Check, X, Download, ChevronLeft, ChevronRight, Images
} from 'lucide-react';
import { format } from 'date-fns';

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  // Main poster lightbox
  const [posterLightboxOpen, setPosterLightboxOpen] = useState(false);

  // Gallery lightbox
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Touch swipe state for gallery lightbox
  const touchStartX = useRef<number | null>(null);

  // ── Keyboard handling ──────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (posterLightboxOpen) {
        if (e.key === 'Escape') setPosterLightboxOpen(false);
        return;
      }
      if (galleryLightboxOpen && event?.gallery?.length) {
        if (e.key === 'Escape') setGalleryLightboxOpen(false);
        if (e.key === 'ArrowLeft')  setGalleryIndex(i => Math.max(0, i - 1));
        if (e.key === 'ArrowRight') setGalleryIndex(i => Math.min((event.gallery!.length - 1), i + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [posterLightboxOpen, galleryLightboxOpen, event]);

  // ── Fetch event ────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // ── Safe back ──────────────────────────────────────────────────
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // ── Share ──────────────────────────────────────────────────────
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: event?.title || 'Check out this event',
      text: `${event?.title} by ${event?.club} on ${event?.date}`,
      url: shareUrl,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch { /* unavailable */ }
    }
  };

  // ── Download image ─────────────────────────────────────────────
  // Fetches the image as a blob and triggers browser download
  // Works for both main poster and gallery images
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectURL);
    } catch {
      // Fallback: open in new tab if fetch blocked by CORS
      window.open(url, '_blank');
    }
  };

  // ── Gallery lightbox helpers ───────────────────────────────────
  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryLightboxOpen(true);
  };

  const galleryPrev = () => setGalleryIndex(i => Math.max(0, i - 1));
  const galleryNext = () => {
    if (!event?.gallery) return;
    setGalleryIndex(i => Math.min(event.gallery!.length - 1, i + 1));
  };

  // Touch swipe handlers for gallery lightbox
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) galleryNext();
      else galleryPrev();
    }
    touchStartX.current = null;
  };

  // ── Loading / not found ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-stone-900 mb-4">Event not found</h2>
        <Link to="/" className="text-emerald-600 font-semibold hover:underline">Back to all events</Link>
      </div>
    );
  }

  const eventDate = new Date(event.date + 'T00:00:00');
  const gallery = event.gallery || [];
  const mainPosterURL = event.posterURL || `https://picsum.photos/seed/${event.id}/1200/600`;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center text-stone-500 hover:text-stone-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">

        {/* ── Main Poster ── */}
        <div className="aspect-video sm:aspect-[21/9] relative group">
          <img
            src={mainPosterURL}
            alt={event.title}
            className="w-full h-full object-cover cursor-zoom-in"
            referrerPolicy="no-referrer"
            onClick={() => setPosterLightboxOpen(true)}
          />
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full opacity-80 group-hover:opacity-0 transition-opacity pointer-events-none">
            Tap to enlarge
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
            <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block">
              {event.club}
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">{event.title}</h1>
          </div>
        </div>

        {/* ── Main Poster Lightbox ── */}
        {posterLightboxOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPosterLightboxOpen(false)}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
              <p className="text-white/60 text-sm font-medium truncate max-w-[60%]">{event.title}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleDownload(mainPosterURL, `${event.title}-poster.jpg`); }}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setPosterLightboxOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl p-2 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <img
              src={mainPosterURL}
              alt={event.title}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl mt-10"
              referrerPolicy="no-referrer"
              onClick={e => e.stopPropagation()}
            />
            <p className="absolute bottom-4 text-white/30 text-xs">Tap outside to close</p>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
          <div className="md:col-span-2 space-y-8">

            {/* ── About ── */}
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-4">About the Event</h2>
              <div className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                {event.description || 'No description provided for this event.'}
              </div>
            </div>

            {/* ── Gallery Strip — hidden when empty ── */}
            {gallery.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    <Images className="h-5 w-5 text-emerald-600" />
                    Event Gallery
                  </h2>
                  <span className="text-stone-400 text-sm">{gallery.length} image{gallery.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Horizontal scroll strip — A4 proportions (210:297 ≈ 1:1.414) */}
                <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#d6d3d1 transparent' }}>
                  {gallery.map((url, index) => (
                    <div
                      key={index}
                      className="shrink-0 snap-start cursor-zoom-in relative group/thumb rounded-xl overflow-hidden border border-stone-200 hover:border-emerald-400 transition-colors"
                      style={{ width: '140px', height: '198px' }}  /* A4 ratio */
                      onClick={() => openGallery(index)}
                    >
                      <img
                        src={url}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                          <Images className="h-4 w-4 text-stone-700" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-2">Scroll to see more · Tap to enlarge</p>
              </div>
            )}

            {/* ── Share button ── */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                {shareCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-600">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Share Event</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-2xl p-6 space-y-6 border border-stone-100">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-emerald-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Date</p>
                    <p className="text-stone-900 font-medium">{format(eventDate, 'PPPP')}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-emerald-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Time</p>
                    <p className="text-stone-900 font-medium">{event.time}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-emerald-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Venue</p>
                    <p className="text-stone-900 font-medium">{event.venue}</p>
                  </div>
                </div>
              </div>

              {event.registrationLink && (
                <a
                  href={event.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
                >
                  Register Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              )}
            </div>

            <div className="text-center p-4">
              <p className="text-xs text-stone-400 mb-2">Organized by</p>
              <p className="font-bold text-stone-900">{event.club}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Gallery Lightbox ════════════════════════════════════════ */}
      {galleryLightboxOpen && gallery.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setGalleryLightboxOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
            <p className="text-white/60 text-sm font-medium">
              {galleryIndex + 1} / {gallery.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleDownload(gallery[galleryIndex], `${event.title}-image-${galleryIndex + 1}.jpg`);
                }}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={() => setGalleryLightboxOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-xl p-2 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Prev arrow */}
          {galleryIndex > 0 && (
            <button
              onClick={e => { e.stopPropagation(); galleryPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={gallery[galleryIndex]}
            alt={`Gallery image ${galleryIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl mt-12"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />

          {/* Next arrow */}
          {galleryIndex < gallery.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); galleryNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Dot indicators */}
          {gallery.length > 1 && (
            <div className="absolute bottom-6 flex gap-1.5">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setGalleryIndex(i); }}
                  className={`rounded-full transition-all ${i === galleryIndex ? 'bg-white w-4 h-2' : 'bg-white/40 w-2 h-2'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}