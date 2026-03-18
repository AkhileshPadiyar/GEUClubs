import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Event } from '../types';
import { Calendar, MapPin, Clock, ArrowLeft, ExternalLink, Share2, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

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
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Safe back: goes to previous page if history exists, else goes home
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Share: uses native Web Share API on mobile, falls back to clipboard copy on desktop
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: event?.title || 'Check out this event',
      text: `${event?.title} by ${event?.club} on ${event?.date}`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share — no action needed
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch {
        // Clipboard also unavailable — do nothing silently
      }
    }
  };

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

  // Append T00:00:00 to force local time parsing, avoids UTC shift showing wrong date in India (UTC+5:30)
  const eventDate = new Date(event.date + 'T00:00:00');

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
        <div className="aspect-[21/9] relative">
          <img
            src={event.posterURL || `https://picsum.photos/seed/${event.id}/1200/600`}
            alt={event.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block">
              {event.club}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{event.title}</h1>
          </div>
        </div>

        <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-4">About the Event</h2>
              <div className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                {event.description || 'No description provided for this event.'}
              </div>
            </div>

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
    </div>
  );
}