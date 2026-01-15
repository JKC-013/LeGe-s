
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { Song } from '../types';
import { supabase } from '../lib/supabase';
import SongCard from '../components/SongCard';

interface SearchResultsProps {
  searchTerm: string;
  onSongClick: (id: string) => void;
  onBack: () => void;
  isLoggedIn?: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({ searchTerm, onSongClick, onBack, isLoggedIn }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      const { data } = await supabase.getSongs();
      setSongs(data || []);
      setLoading(false);
    };
    fetchSongs();
  }, [isLoggedIn]);

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return songs.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [songs, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-forest" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-forest transition-colors font-bold text-xs uppercase tracking-widest"
      >
        <ArrowLeft size={18} />
        Back to library
      </button>

      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-navy serif">
          Results for "<span className="text-forest italic">{searchTerm}</span>"
        </h1>
        <p className="text-slate-500 font-medium">Found {filteredResults.length} matching music sheets.</p>
      </div>

      {filteredResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {filteredResults.map(song => (
            <SongCard 
              key={song.id} 
              song={song} 
              isLoggedIn={isLoggedIn}
              onClick={(id) => {
                onSongClick(id);
              }} 
            />
          ))}
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-white/50">
          <Search className="mx-auto mb-6 text-slate-200" size={64} />
          <p className="text-2xl font-bold text-navy serif">No results found</p>
          <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto">We couldn't find anything matching your search. Please try a different term.</p>
          <button 
            onClick={onBack}
            className="mt-8 px-8 py-3 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-all"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
