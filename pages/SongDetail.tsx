
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Share2, Info, Music, Star } from 'lucide-react';
import { Song } from '../types';
import { supabase } from '../lib/supabase';

interface SongDetailProps {
  songId: string;
  onBack: () => void;
  isLoggedIn?: boolean;
}

const SongDetail: React.FC<SongDetailProps> = ({ songId, onBack, isLoggedIn }) => {
  const [song, setSong] = useState<Song | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const totalPages = 5; // Simulated for mock PDF

  useEffect(() => {
    const fetchSong = async () => {
      const { data } = await supabase.getSongs();
      const found = data?.find(s => s.id === songId);
      if (found) {
        setSong(found);
        setIsFav(found.isFavorite || false);
      }
    };
    fetchSong();
  }, [songId]);

  const handleFavorite = () => {
    if (song) {
      supabase.toggleFavorite(song.id);
      setIsFav(!isFav);
    }
  };

  if (!song) return null;

  const currentVariant = song.variants[selectedVariantIndex];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-forest hover:translate-x-[-4px] transition-all font-bold text-xs uppercase tracking-widest mb-8 active:text-forest active:scale-95"
      >
        <ArrowLeft size={20} />
        Back to search
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Metadata Sidebar */}
        <div className="space-y-8">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-5xl font-bold serif text-navy leading-tight">{song.name}</h1>
              {isLoggedIn && (
                <button 
                  onClick={handleFavorite}
                  className={`p-3 rounded-2xl border transition-all ${isFav ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-white border-beige-darker text-slate-300 hover:text-amber-400 hover:border-amber-200'}`}
                  title={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star size={24} fill={isFav ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {song.categories.map(cat => (
                <span key={cat} className="px-3 py-1 bg-forest-pale text-forest border border-forest/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 border border-beige-darker rounded-[2rem] shadow-sm space-y-8">
            <h3 className="flex items-center gap-2 font-bold text-navy uppercase tracking-widest text-xs border-b border-beige-darker pb-4">
              <Info size={18} className="text-forest" /> Song Details
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">Available Keys</p>
                <div className="flex flex-wrap gap-2">
                  {song.variants.map((variant, idx) => (
                    <button
                      key={variant.key}
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`min-w-[48px] h-11 px-4 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${selectedVariantIndex === idx ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'bg-white text-slate-500 border border-beige-darker hover:bg-forest-pale hover:border-forest/50 active:bg-forest active:text-white'}`}
                    >
                      {variant.key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] mb-1">Instrument</p>
                  <p className="text-lg font-bold text-navy serif group-hover:text-forest transition-colors">{song.instrument}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] mb-1">Total Search</p>
                  <p className="text-lg font-bold text-navy serif group-hover:text-forest transition-colors">{song.search_count.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <a 
                href={currentVariant?.pdf_url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-forest hover:bg-forest-hover active:bg-forest active:scale-[0.98] text-white rounded-2xl font-bold transition-all shadow-xl shadow-forest/10"
              >
                <Download size={18} /> Download {currentVariant?.key} Key PDF
              </a>
              <button className="flex items-center justify-center gap-2 w-full py-4 border border-beige-darker hover:bg-forest-pale hover:text-forest hover:border-forest active:bg-forest active:text-white rounded-2xl font-bold transition-all text-slate-500">
                <Share2 size={18} /> Share Sheet
              </button>
            </div>
          </div>
        </div>

        {/* Music Score Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative group bg-beige-dark rounded-[2.5rem] overflow-hidden border border-beige-darker min-h-[850px] flex items-center justify-center shadow-inner">
            <div className="w-[85%] h-[92%] bg-white shadow-2xl rounded-sm p-12 flex flex-col relative animate-in fade-in zoom-in-95 duration-300" key={currentVariant?.key}>
              <div className="flex justify-between items-center mb-12 border-b-2 border-black/5 pb-4">
                <span className="serif text-2xl font-bold text-navy/40 group-hover:text-forest transition-colors">LeGe's • Key of {currentVariant?.key}</span>
                <span className="text-[10px] font-bold tracking-widest text-slate-300">PAGE {currentPage} / {totalPages}</span>
              </div>
              
              <div className="flex-grow space-y-10 py-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5 opacity-10">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-[2px] bg-navy w-full" />
                    ))}
                  </div>
                ))}
                <div className="text-center italic text-slate-300 py-12 serif text-xl select-none group-hover:text-forest/20 transition-colors">
                  Simulated Score Preview for "{song.name}" in Key {currentVariant?.key}...
                </div>
              </div>

              {/* Navigation overlay */}
              <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-4 bg-white/90 shadow-xl rounded-full hover:bg-forest hover:text-white disabled:opacity-20 transition-all text-navy active:scale-90"
                >
                  <ChevronLeft size={32} />
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-4 bg-white/90 shadow-xl rounded-full hover:bg-forest hover:text-white disabled:opacity-20 transition-all text-navy active:scale-90"
                >
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] px-8">
            <p>Viewing Page {currentPage} of {totalPages}</p>
            <p>Sheet quality: HD (PDF)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;
