
import React, { useState, useEffect } from 'react';
import { Star, Loader2, ArrowLeft } from 'lucide-react';
import { Song } from '../types';
import { supabase } from '../lib/supabase';
import SongCard from '../components/SongCard';

interface FavoritesProps {
  onSongClick: (id: string) => void;
  onBack: () => void;
  isLoggedIn?: boolean;
}

const Favorites: React.FC<FavoritesProps> = ({ onSongClick, onBack, isLoggedIn }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavs = async () => {
    const { data } = await supabase.getSongs();
    setSongs((data || []).filter(s => s.isFavorite));
    setLoading(false);
  };

  useEffect(() => {
    fetchFavs();
  }, []);

  const handleFavoriteToggle = (id: string) => {
    // Optimistic UI: remove immediately from list if on favorites page
    setSongs(prev => prev.filter(s => s.id !== id));
  };

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
          Your <span className="text-forest italic">Favorites</span>
        </h1>
        <p className="text-slate-500 font-medium">Quick access to the music sheets you use most.</p>
      </div>

      {songs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {songs.map(song => (
            <SongCard 
              key={song.id} 
              song={song} 
              onClick={(id) => onSongClick(id)} 
              isLoggedIn={isLoggedIn}
              onFavoriteChange={handleFavoriteToggle}
            />
          ))}
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-white/50">
          <Star className="mx-auto mb-6 text-slate-200" size={64} />
          <p className="text-2xl font-bold text-navy serif">No favorites yet</p>
          <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto">Click the star icon on any sheet to add it to your collection.</p>
          <button 
            onClick={onBack}
            className="mt-8 px-8 py-3 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-all"
          >
            Explore Library
          </button>
        </div>
      )}
    </div>
  );
};

export default Favorites;
