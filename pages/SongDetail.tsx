
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Star, 
  Loader2, 
  CheckCircle2, 
  Music, 
  ExternalLink, 
  Maximize2, 
  Minimize2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
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
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Use a ref to prevent re-fetching the entire song if we already have the PDF URL
  const hasLoadedSong = useRef(false);

  useEffect(() => {
    const fetchSong = async () => {
      // Only show the main loader if we haven't loaded the song yet
      if (!hasLoadedSong.current) setLoading(true);
      
      const { data } = await supabase.getSongById(songId);
      if (data) {
        setSong(data);
        setIsFav(data.isFavorite || false);
        hasLoadedSong.current = true;
      }
      setLoading(false);
    };
    fetchSong();
  }, [songId, isLoggedIn]); // Re-run on login change to update isFav, but ref handles the loading UI

  useEffect(() => {
    if (!song) return;
    setPdfLoading(true);
    // Give the iframe a moment to mount
    const timer = setTimeout(() => setPdfLoading(false), 1200);
    return () => clearTimeout(timer);
  }, [selectedVariantIndex, song?.id]);

  const handleFavorite = async () => {
    if (song && isLoggedIn) {
      const { success } = await supabase.toggleFavorite(song.id);
      if (success) setIsFav(!isFav);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const handleDownload = async () => {
    if (!song) return;
    const currentVariant = song.variants[selectedVariantIndex];
    const pdfUrl = currentVariant?.pdf_url;
    if (!pdfUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.name} - ${currentVariant.key}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(pdfUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading && !hasLoadedSong.current) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-forest" size={40} />
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Opening Music Library...</p>
    </div>
  );

  if (!song) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center px-6">
      <Music size={64} className="text-slate-200" />
      <p className="text-xl font-bold text-navy serif">Song not found</p>
      <button onClick={onBack} className="px-6 py-3 bg-forest text-white rounded-xl font-bold">Return to Library</button>
    </div>
  );

  const currentVariant = song.variants[selectedVariantIndex];
  
  // Google Viewer is generally the most compatible for web embedding
  const googleViewerUrl = currentVariant?.pdf_url 
    ? `https://docs.google.com/gview?url=${encodeURIComponent(currentVariant.pdf_url)}&embedded=true` 
    : '';

  return (
    <div className={`transition-all duration-500 ease-in-out ${isTheaterMode ? 'bg-[#1a1c1e] min-h-screen text-white pb-20' : 'max-w-7xl mx-auto px-6 py-12'}`}>
      <div className={`flex items-center justify-between mb-8 ${isTheaterMode ? 'px-8 py-4 border-b border-white/10' : ''}`}>
        <button onClick={onBack} className={`flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-widest ${isTheaterMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-forest'}`}>
          <ArrowLeft size={18} /> Back to Library
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isTheaterMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-forest-pale text-forest hover:bg-forest hover:text-white'}`}
          >
            {isTheaterMode ? <><Minimize2 size={16} /> Exit Theater</> : <><Maximize2 size={16} /> Theater Mode</>}
          </button>
        </div>
      </div>

      <div className={`grid gap-12 transition-all duration-500 ${isTheaterMode ? 'px-8 grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'}`}>
        
        {/* Sidebar */}
        <div className={`space-y-8 ${isTheaterMode ? 'hidden' : 'lg:col-span-1'}`}>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold serif text-navy leading-tight">{song.name}</h1>
            <div className="flex flex-wrap gap-2">
              {song.categories.map(cat => (
                <span key={cat} className="px-2 py-0.5 bg-forest-pale text-forest border border-forest/10 rounded-md text-[9px] font-bold uppercase tracking-widest">{cat}</span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 border border-beige-darker rounded-3xl shadow-sm space-y-6">
            <div className="space-y-4">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">Key Selection</p>
              <div className="grid grid-cols-3 gap-2">
                {song.variants.map((variant, idx) => (
                  <button
                    key={variant.key}
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`h-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${selectedVariantIndex === idx ? 'bg-forest text-white' : 'bg-white text-slate-500 border border-beige-darker hover:border-forest/50'}`}
                  >
                    <span className="normal-case">{variant.key}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">Actions</p>
              <div className="flex flex-col gap-2">
                {isLoggedIn && (
                  <button 
                    onClick={handleFavorite}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${isFav ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-beige-darker text-slate-400 hover:text-navy hover:border-navy'}`}
                  >
                    <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                    {isFav ? 'Favorited' : 'Add to Favorites'}
                  </button>
                )}
                <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3 border border-beige-darker rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-forest-pale hover:text-forest transition-all">
                  {shareSuccess ? <><CheckCircle2 size={16} /> Copied</> : <><Share2 size={16} /> Share Link</>}
                </button>
                
                <button 
                  onClick={handleDownload}
                  disabled={isDownloading || !currentVariant?.pdf_url}
                  className="flex items-center justify-center gap-2 py-3 bg-forest text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-forest-hover transition-all shadow-lg shadow-forest/10 w-full disabled:opacity-70"
                >
                  {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {isDownloading ? 'Preparing...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className={`${isTheaterMode ? 'w-full max-w-5xl mx-auto' : 'lg:col-span-3'} space-y-6`}>
          {isTheaterMode && (
            <div className="flex items-center justify-between mb-6 bg-white/5 p-5 rounded-2xl border border-white/5">
               <h2 className="text-2xl font-bold serif">{song.name} — Key <span className="normal-case">{currentVariant.key}</span></h2>
               <div className="flex items-center gap-2">
                  {song.variants.map((variant, idx) => (
                    <button key={variant.key} onClick={() => setSelectedVariantIndex(idx)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedVariantIndex === idx ? 'bg-white text-navy' : 'bg-white/10 text-white hover:bg-white/20'}`}><span className="normal-case">{variant.key}</span></button>
                  ))}
               </div>
            </div>
          )}

          {/* Viewer Container */}
          <div className={`relative flex flex-col items-center rounded-[2.5rem] p-4 sm:p-8 transition-all duration-500 ${isTheaterMode ? 'bg-[#121212] border-white/5' : 'bg-white border border-beige-darker shadow-2xl'}`}>
            
            {/* The PDF Frame - Extended to a more natural score length */}
            <div className={`relative w-full aspect-[1/1.41] min-h-[800px] max-h-[1400px] transition-all duration-700 ${isTheaterMode ? 'shadow-[0_0_100px_rgba(0,0,0,0.8)]' : 'shadow-inner'}`}>
              
              {pdfLoading ? (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-beige-bg rounded-[1.5rem] border-2 border-dashed border-beige-darker">
                   <Loader2 className="animate-spin text-forest mb-4" size={48} />
                   <p className="text-xs font-bold uppercase tracking-widest text-forest">Preparing Music Sheet...</p>
                 </div>
              ) : currentVariant?.pdf_url ? (
                <div className="w-full h-full relative bg-white rounded-[1.5rem] overflow-hidden">
                  <iframe
                    src={googleViewerUrl}
                    className="w-full h-full border-none"
                    key={`${song.id}-${selectedVariantIndex}`}
                    title="Score Viewer"
                  />
                  
                  {/* Quick Action Button */}
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <a 
                      href={currentVariant?.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-4 py-2 bg-forest/90 backdrop-blur rounded-lg text-white text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-forest transition-colors"
                    >
                      <ExternalLink size={14} /> Full Screen
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-[1.5rem]">
                  <Music size={48} className="text-slate-300 mb-4" />
                  <p className="font-bold text-slate-400">Score preparation failed</p>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-6 mt-8 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 ${isTheaterMode ? 'text-white' : 'text-slate-500'}`}>
              <div className="flex items-center gap-2"><BookOpen size={14} /> <span>Interactive Music Reader</span></div>
              <a href={currentVariant?.pdf_url} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity flex items-center gap-1 underline">
                <ExternalLink size={12} /> Secure Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetail;
