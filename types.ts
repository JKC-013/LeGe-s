
export type Category = 'Christmas' | 'Easter' | 'Worship' | 'Others';
export type Instrument = 'Piano' | 'Band';

export interface SongVariant {
  key: string;
  pdf_url: string;
}

export interface Song {
  id: string;
  name: string;
  categories: Category[];
  instrument: Instrument;
  created_at: string;
  variants: SongVariant[];
  isFavorite?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at?: string;
}
