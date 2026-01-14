
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
  search_count: number;
  created_at: string;
  variants: SongVariant[];
  isFavorite?: boolean;
}

export interface Admin {
  id: string;
  email: string;
}

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}
