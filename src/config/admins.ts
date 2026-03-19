
export const ADMIN_EMAILS = [
  'akhileshpadiyar74@gmail.com',
  'hanubhakta0101@gmail.com',
  'work.luckyjaiswal@gmail.com',
];

export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
};