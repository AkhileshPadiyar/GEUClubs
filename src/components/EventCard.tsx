import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // Append T00:00:00 to force local time parsing, avoids UTC shift showing wrong date in India (UTC+5:30)
  const eventDate = new Date(event.date + 'T00:00:00');

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={event.posterURL || `https://picsum.photos/seed/${event.id}/800/450`} 
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-sm text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-emerald-100">
            {event.club}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-stone-900 mb-3 line-clamp-1">{event.title}</h3>
        <div className="space-y-2 mb-5">
          <div className="flex items-center text-stone-500 text-sm">
            <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
            <span>{format(eventDate, 'PPP')}</span>
          </div>
          <div className="flex items-center text-stone-500 text-sm">
            <Clock className="h-4 w-4 mr-2 text-emerald-600" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center text-stone-500 text-sm">
            <MapPin className="h-4 w-4 mr-2 text-emerald-600" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
        </div>
        <Link 
          to={`/events/${event.id}`}
          className="block w-full text-center bg-stone-50 text-stone-900 border border-stone-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default EventCard;