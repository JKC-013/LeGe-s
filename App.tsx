import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Star, LogIn, Loader2, X, Music, Heart, Facebook, Mail, User, Eye, EyeOff } from 'lucide-react';
import Logo from './components/Logo';
import Home from './pages/Home';
import SongDetail from './pages/SongDetail';
import AdminPanel from './pages/AdminPanel';
import SearchResults from './pages/SearchResults';
import Favorites from './pages/Favorites';
import { supabase } from './lib/supabase';
import { AuthUser } from './types';

type Page = 'home' | 'detail' | 'admin' | 'results' | 'favorites';
type AuthMode = 'signin' | 'signup' | 'success';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Global refresh triggers remount of subpages on demand (e.g. navigation)
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (isAuthModalOpen) {
      setAuthEmail('');
      setAuthPassword('');
      setAuthUsername('');
      setAuthError(null);
      setShowPassword(false);
    }
  }, [authMode, isAuthModalOpen]);

  useEffect(() => {
    // Safety fallback: Ensure the splash screen disappears after 1.5 seconds maximum
    // even if the auth initialization hangs.
    const safetyTimer = setTimeout(() => setIsInitializing(false), 1500);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.client.auth.getSession();
        if (session) {
          const authUser = await supabase.setSessionUser(session);
          setUser(authUser);
        }
      } catch (err) {
        console.warn("Auth check failed or slow.");
      } finally {
        setIsInitializing(false);
        clearTimeout(safetyTimer);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentPage('home');
        setIsAuthModalOpen(false);
      } else if (session) {
        const authUser = await supabase.setSessionUser(session);
        setUser(authUser);
        if (event === 'SIGNED_IN') setIsAuthModalOpen(false);
      }
      setIsInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.signInWithEmail(authEmail, authPassword);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error("Account details incorrect. Please try again.");
          }
          throw error;
        }
      } else {
        if (authUsername.trim().length < 3) throw new Error("Username too short.");
        const { error } = await supabase.signUpWithEmail(authEmail, authPassword, authUsername);
        if (error) throw error;
        setAuthMode('success');
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOpenAuth = (mode: Exclude<AuthMode, 'success'>) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    setUser(null);
    setCurrentPage('home');
    setSelectedSongId(null);
    await supabase.logout();
  };

  const navigateToDetail = (id: string) => {
    setSelectedSongId(id);
    setCurrentPage('detail');
    window.scrollTo(0, 0);
  };

  const navigateToHome = () => {
    setCurrentPage('home');
    setSelectedSongId(null);
    setGlobalSearchTerm('');
    triggerRefresh();
    window.scrollTo(0, 0);
  };

  const isLoggedIn = !!user;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige-bg">
        <Logo className="h-16 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-beige-bg">
      <nav className="sticky top-0 z-50 bg-[#fbf9f4]/90 backdrop-blur-xl border-b border-beige-darker py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="cursor-pointer" onClick={navigateToHome}><Logo /></div>
          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <button 
                onClick={() => { setCurrentPage('favorites'); triggerRefresh(); }}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${currentPage === 'favorites' ? 'text-forest bg-forest/5' : 'text-slate-400 hover:text-forest hover:bg-forest-pale'}`}
              >
                <Star size={20} className={currentPage === 'favorites' ? 'fill-current' : ''} />
                <span className="hidden md:inline">Favorites</span>
              </button>
            )}
            {user?.isAdmin && (
              <button onClick={() => { setCurrentPage('admin'); triggerRefresh(); }} className={`p-2 rounded-lg transition-colors ${currentPage === 'admin' ? 'text-forest bg-forest/5' : 'text-slate-400 hover:text-forest hover:bg-forest-pale'}`}><LayoutDashboard size={22} /></button>
            )}
            {user ? (
              <div className="flex items-center gap-5 border-l border-beige-darker pl-6">
                <button onClick={handleLogout} className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors cursor-pointer">Logout</button>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Welcome</p>
                    <p className="text-sm font-bold text-navy truncate max-w-[120px]">{user.username}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center font-bold uppercase shadow-sm">
                    {user.username?.[0] || user.email?.[0]}
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => handleOpenAuth('signin')} className="px-6 py-2.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-hover flex items-center gap-2 shadow-lg shadow-forest/10 transition-all active:scale-95"><LogIn size={18} /> Sign In</button>
            )}
          </div>
        </div>
      </nav>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-navy/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-beige-bg rounded-[2.5rem] shadow-2xl overflow-hidden p-8 sm:p-10 space-y-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            
            {authMode === 'success' ? (
              <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-forest-pale rounded-full flex items-center justify-center mx-auto text-forest"><Mail size={40} /></div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold serif text-navy">Check your email</h2>
                  <p className="text-slate-500 font-medium">Please verify your account to continue.</p>
                </div>
                <button onClick={() => setAuthMode('signin')} className="w-full py-4 bg-forest text-white rounded-2xl font-bold shadow-xl shadow-forest/10 hover:bg-forest-hover transition-all">Back to Sign In</button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-4">
                  <Logo className="mx-auto" />
                  <h2 className="text-[40px] font-bold serif text-navy tracking-tight">{authMode === 'signin' ? 'Welcome Back' : 'Join LeGe\'s'}</h2>
                </div>
                <form onSubmit={handleAuthAction} className="space-y-6">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Username</label>
                      <input type="text" required className="w-full px-6 py-4 bg-white border border-beige-darker rounded-2xl outline-none transition-all font-semibold text-navy focus:ring-4 focus:ring-forest-pale focus:border-forest shadow-sm placeholder:text-slate-300" placeholder="Your Display Name" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Email</label>
                    <input type="email" required className="w-full px-6 py-4 bg-white border border-beige-darker rounded-2xl outline-none transition-all font-semibold text-navy focus:ring-4 focus:ring-forest-pale focus:border-forest shadow-sm placeholder:text-slate-300" placeholder="name@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required className="w-full px-6 py-4 pr-14 bg-white border border-beige-darker rounded-2xl outline-none transition-all font-semibold text-navy focus:ring-4 focus:ring-forest-pale focus:border-forest shadow-sm placeholder:text-slate-300" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-forest transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  {authError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl animate-in shake-in border border-red-100">{authError}</div>}
                  <button type="submit" disabled={authLoading} className="w-full py-5 bg-forest text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-forest/10 hover:bg-forest-hover transition-all active:scale-[0.98]">
                    {authLoading ? <Loader2 className="animate-spin" /> : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
                <div className="pt-6 border-t border-beige-darker text-center">
                  <p className="text-sm font-medium text-slate-500">
                    {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                    <button type="button" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="ml-2 text-forest font-bold hover:underline">
                      {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="flex-grow">
        {currentPage === 'home' && <Home key={`home-${refreshKey}`} onSongClick={navigateToDetail} onGlobalSearch={(t) => { setGlobalSearchTerm(t); setCurrentPage('results'); }} isLoggedIn={isLoggedIn} />}
        {currentPage === 'results' && <SearchResults key={`results-${globalSearchTerm}-${refreshKey}`} searchTerm={globalSearchTerm} onSongClick={navigateToDetail} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        {currentPage === 'detail' && selectedSongId && <SongDetail key={`detail-${selectedSongId}-${refreshKey}`} songId={selectedSongId} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        {currentPage === 'admin' && <AdminPanel key={`admin-${refreshKey}`} />}
        {currentPage === 'favorites' && <Favorites key={`favorites-${refreshKey}`} onSongClick={navigateToDetail} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
      </main>

      <footer className="bg-white border-t border-beige-darker py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Logo />
            <p className="text-slate-500 text-sm font-medium max-w-sm text-center md:text-left leading-relaxed">LeGe's Archive is dedicated to preserving our community legacy.</p>
          </div>
          <div className="flex flex-col items-center gap-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Connect with us</h4>
            <a href="https://www.facebook.com/profile.php?id=61583651651181" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-3 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl font-bold text-sm hover:bg-[#1877F2] hover:text-white transition-all shadow-sm">
              <Facebook size={20} /> LeGe's Facebook
            </a>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            <p>© {new Date().getFullYear()} LeGe's Music Sheets</p>
            <div className="flex items-center gap-2">Made with <Heart size={14} className="text-red-400 fill-current" /> for the community</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;