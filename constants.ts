
import { Category, Instrument, Song } from './types';

export const CATEGORIES: Category[] = ['Christmas', 'Easter', 'Worship', 'Others'];
export const INSTRUMENTS: Instrument[] = ['Piano', 'Band'];

export const MOCK_SONGS: Song[] = [
  {
    id: '1',
    name: 'Amazing Grace',
    categories: ['Worship'],
    instrument: 'Piano',
    search_count: 1250,
    created_at: '2023-01-01T00:00:00Z',
    variants: [
      { key: 'G', pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
      { key: 'F', pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
    ]
  },
  {
    id: '2',
    name: 'Silent Night',
    categories: ['Christmas'],
    instrument: 'Piano',
    search_count: 3400,
    created_at: '2023-11-15T00:00:00Z',
    variants: [
      { key: 'C', pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
    ]
  },
  {
    id: '3',
    name: 'Glorious Day',
    categories: ['Worship', 'Easter'],
    instrument: 'Band',
    search_count: 890,
    created_at: '2023-03-20T00:00:00Z',
    variants: [
      { key: 'B', pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
      { key: 'A', pdf_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
    ]
  }
];
