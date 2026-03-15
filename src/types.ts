export interface Event {
  id: string;
  title: string;
  club: string;
  clubId?: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  posterURL?: string;
  registrationLink?: string;
  createdBy: string;
  createdAt?: any;
}

export interface Club {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  ownerUid?: string;
}
