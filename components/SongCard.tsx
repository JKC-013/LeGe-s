
import React from 'react';
import { Song } from '../types';
import { Music, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SongCardProps {
  song: Song;
  onClick: (id: string) => void;
  isLoggedIn?: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, onClick, isLoggedIn }) => {
  const [isFav, setIsFav] = React.useState(song.isFavorite);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    supabase.toggleFavorite(song.id);
    setIsFav(!isFav);
  };

  return (
    <div 
      onClick={() => onClick(song.id)}
      className="group bg-white p-7 border border-beige-darker rounded-2xl shadow-sm hover:shadow-xl hover:border-forest hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full active:scale-[0.98] active:border-forest"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="p-3 bg-forest-pale rounded-xl text-forest group-hover:bg-forest group-hover:text-white transition-colors">
          <Music size={22} />
        </div>
        {isLoggedIn && (
          <button 
            onClick={handleFavorite}
            className={`p-2 rounded-full transition-all ${isFav ? 'text-amber-500 bg-amber-50' : 'text-slate-200 hover:text-amber-400 hover:bg-forest-pale'}`}
          >
            <Star size={20} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      
      <h3 className="text-xl font-bold mb-4 text-navy group-hover:text-forest transition-colors line-clamp-2 serif leading-tight">
        {song.name}
      </h3>
      
      <div className="mt-auto space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {song.categories.map(cat => (
            <span key={cat} className="text-[9px] uppercase tracking-widest font-bold text-slate-400 group-hover:text-forest transition-colors">
              {cat}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest border-t border-beige-darker pt-4 group-hover:border-forest/20 transition-colors">
          <span className="flex items-center gap-1">Keys <span className="text-navy group-hover:text-forest">{song.variants.map(v => v.key).join(', ')}</span></span>
          <span className="text-forest/60">{song.search_count.toLocaleString()} searches</span>
        </div>
      </div>
    </div>
  );
};

export default SongCard;
