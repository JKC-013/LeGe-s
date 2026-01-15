
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Music, AlertCircle } from 'lucide-react';
import { Song, Category } from '../types';
import { CATEGORIES } from '../constants';
import { supabase } from '../lib/supabase';
import SongCard from '../components/SongCard';
import { useDebounce } from '../hooks/useDebounce';

const ITEMS_PER_PAGE = 15;

interface HomeProps {
  onSongClick: (id: string) => void;
  onGlobalSearch: (term: string) => void;
  isLoggedIn?: boolean;
}

const Home: React.FC<HomeProps> = ({ onSongClick, onGlobalSearch, isLoggedIn }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search States
  const [heroSearch, setHeroSearch] = useState('');
  const [gridSearch, setGridSearch] = useState('');
  
  // Debounce search terms to prevent lag on heavy filtering
  const debouncedHeroSearch = useDebounce(heroSearch, 300);
  const debouncedGridSearch = useDebounce(gridSearch, 300);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: all } = await supabase.getSongs();
      setSongs(all || []);
      setLoading(false);
    };
    fetchData();
  }, [isLoggedIn]); // Re-fetch when login state changes to update stars

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Use debounced value for expensive filtering
  const heroSuggestions = useMemo(() => {
    if (!debouncedHeroSearch.trim()) return [];
    return songs.filter(s => 
      s.name.toLowerCase().includes(debouncedHeroSearch.toLowerCase())
    ).slice(0, 5);
  }, [songs, debouncedHeroSearch]);

  // Use debounced value for expensive filtering
  const filteredSongs = useMemo(() => {
    return songs.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(debouncedGridSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || s.categories.includes(selectedCategory as Category);
      return matchesSearch && matchesCategory;
    });
  }, [songs, debouncedGridSearch, selectedCategory]);

  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const currentSongs = filteredSongs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSongClick = (id: string) => {
    onSongClick(id);
  };

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      onGlobalSearch(heroSearch);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-24 pb-24">
      {/* Hero Section */}
      <section className="text-center space-y-10 py-16">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.1] text-navy serif">
          All your scores, <br /> 
          <span className="text-forest italic">now available online.</span>
        </h1>
        
        <div ref={searchRef} className="max-w-2xl mx-auto relative group">
          <form onSubmit={handleHeroSubmit}>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-forest transition-colors" />
              <input 
                type="text"
                placeholder="Enter the song title to search across the library"
                className="w-full pl-16 pr-6 py-6 bg-white border border-beige-darker rounded-[2rem] shadow-sm focus:ring-4 focus:ring-forest-pale focus:border-forest outline-none text-lg transition-all"
                value={heroSearch}
                onChange={(e) => {
                  setHeroSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && debouncedHeroSearch.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-beige-darker rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-beige-darker bg-beige-light/50">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 ml-2">
                  {heroSuggestions.length > 0 ? "Quick results" : "No results"}
                </p>
              </div>
              
              {heroSuggestions.length > 0 ? (
                <>
                  {heroSuggestions.map(song => (
                    <button 
                      key={song.id}
                      onClick={() => handleSongClick(song.id)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-forest-pale transition-colors text-left group"
                    >
                      <div className="p-2 bg-forest-pale rounded-lg text-forest group-hover:bg-forest group-hover:text-white transition-colors">
                        <Music size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-navy truncate group-hover:text-forest transition-colors">{song.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{song.instrument} • {song.variants.length} keys</p>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => onGlobalSearch(heroSearch)}
                    className="w-full py-4 text-center text-xs font-bold text-forest hover:bg-forest-pale active:bg-forest active:text-white transition-all border-t border-beige-darker"
                  >
                    See all results for "{heroSearch}"
                  </button>
                </>
              ) : (
                <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                  <AlertCircle size={24} className="text-slate-300" />
                  <p className="text-sm font-bold text-slate-400">No matching songs found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* All Songs Section */}
      <section id="all-songs" className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <h2 className="text-4xl font-bold text-navy serif">Browse Music Sheets</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-forest transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search within these results"
                className="pl-12 pr-6 py-3 bg-white border border-beige-darker rounded-xl text-sm font-semibold focus:ring-2 focus:ring-forest-pale focus:border-forest outline-none w-full md:w-64 transition-all"
                value={gridSearch}
                onChange={(e) => {
                  setGridSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <button 
                onClick={() => setSelectedCategory('All')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-widest ${selectedCategory === 'All' ? 'bg-forest text-white shadow-lg shadow-forest/10 active:scale-[0.95]' : 'bg-white text-slate-500 border border-beige-darker hover:bg-forest-pale hover:border-forest/50 active:bg-forest active:text-white'}`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-widest ${selectedCategory === cat ? 'bg-forest text-white shadow-lg shadow-forest/10 active:scale-[0.95]' : 'bg-white text-slate-500 border border-beige-darker hover:bg-forest-pale hover:border-forest/50 active:bg-forest active:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {currentSongs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {currentSongs.map(song => (
              <SongCard key={song.id} song={song} onClick={handleSongClick} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-white/50">
            <Search className="mx-auto mb-6 text-slate-200" size={64} />
            <p className="text-2xl font-bold text-navy serif">No matching sheets</p>
            <p className="text-slate-400 font-medium mt-2 text-center px-6">Try searching with a different term or category.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-12">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-4 border border-beige-darker rounded-xl disabled:opacity-20 hover:bg-forest-pale hover:border-forest active:bg-forest active:text-white transition-all group"
            >
              <ChevronLeft size={20} className="group-hover:text-forest group-active:text-white transition-colors" />
            </button>
            <span className="text-xs font-bold text-navy uppercase tracking-[0.2em] px-6">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-4 border border-beige-darker rounded-xl disabled:opacity-20 hover:bg-forest-pale hover:border-forest active:bg-forest active:text-white transition-all group"
            >
              <ChevronRight size={20} className="group-hover:text-forest group-active:text-white transition-colors" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
