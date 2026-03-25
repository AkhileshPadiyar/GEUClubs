export interface Event {
  id: string;
  title: string;
  club: string;
  clubId: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  posterURL?: string;
  gallery?: string[];     // additional posters/images, max 8
  registrationLink?: string;
  createdBy: string;
  createdAt?: any;
}

export interface Club {
  id: string;
  name: string;           // locked — only admin can change
  logo?: string;          // profile picture
  bannerImage?: string;   // wide header image for club detail page
  description?: string;   // about the club
  instagram?: string;     // @handle or full URL
  facebook?: string;      // page URL
  twitter?: string;       // @handle or full URL (Twitter / X)
  website?: string;       // official website URL
  email?: string;         // contact email
}

export interface AllowedOrganiser {
  email: string;
  clubId: string;
  clubName: string;
  addedAt?: any;
}