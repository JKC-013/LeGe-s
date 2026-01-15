
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Star, LogIn, Loader2, X, Music, Heart, Facebook, Mail, User } from 'lucide-react';
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

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Refresh inputs when switching modes
  useEffect(() => {
    if (isAuthModalOpen) {
      setAuthEmail('');
      setAuthPassword('');
      setAuthUsername('');
      setAuthError(null);
    }
  }, [authMode, isAuthModalOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('auth');
    if (mode === 'signin' || mode === 'signup') {
      setAuthMode(mode as AuthMode);
      setIsAuthModalOpen(true);
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.client.auth.getSession();
        if (session) {
          const authUser = await supabase.setSessionUser(session);
          setUser(authUser);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsInitializing(false);
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
        setIsAuthModalOpen(false);
        const params = new URLSearchParams(window.location.search);
        if (params.has('auth')) {
          params.delete('auth');
          window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
        }
      }
    });

    return () => subscription.unsubscribe();
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
            throw new Error("Information provided is not correct. Please check your email or password.");
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error("Account found, but email is not confirmed. Please check your inbox for the link.");
          }
          throw error;
        }
      } else {
        if (authUsername.trim().length < 3) throw new Error("Username must be at least 3 characters long.");
        const { error } = await supabase.signUpWithEmail(authEmail, authPassword, authUsername);
        if (error) throw error;
        setAuthMode('success');
      }
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred. Please try again.");
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
                onClick={() => setCurrentPage('favorites')}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${currentPage === 'favorites' ? 'text-forest bg-forest/5' : 'text-slate-400 hover:text-forest hover:bg-forest-pale'}`}
              >
                <Star size={20} className={currentPage === 'favorites' ? 'fill-current' : ''} />
                <span className="hidden md:inline">Favorites</span>
              </button>
            )}
            {user?.isAdmin && (
              <button onClick={() => setCurrentPage('admin')} className={`p-2 rounded-lg transition-colors ${currentPage === 'admin' ? 'text-forest bg-forest/5' : 'text-slate-400 hover:text-forest hover:bg-forest-pale'}`}><LayoutDashboard size={22} /></button>
            )}
            {user ? (
              <div className="flex items-center gap-5 border-l border-beige-darker pl-6">
                <button 
                  onClick={handleLogout} 
                  className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Logout
                </button>
                <div className="flex items-center gap-3 group">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Welcome</p>
                    <p className="text-sm font-bold text-navy truncate max-w-[120px]">{user.username}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center font-bold uppercase shadow-sm group-hover:scale-105 transition-transform">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy/40 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-beige-bg rounded-[2.5rem] shadow-2xl overflow-hidden p-10 space-y-8 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            
            {authMode === 'success' ? (
              <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-forest-pale rounded-full flex items-center justify-center mx-auto text-forest">
                  <Mail size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold serif text-navy">Check your email</h2>
                  <p className="text-slate-500 font-medium">Successfully signed up! We've sent a confirmation link to your inbox. Please verify your account to continue.</p>
                </div>
                <button 
                  onClick={() => setAuthMode('signin')}
                  className="w-full py-4 bg-forest text-white rounded-2xl font-bold shadow-xl shadow-forest/10 hover:bg-forest-hover transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <Logo className="mx-auto h-12" />
                  <h2 className="text-3xl font-bold serif text-navy mt-4">{authMode === 'signin' ? 'Welcome Back' : 'Join LeGe\'s'}</h2>
                </div>
                <form onSubmit={handleAuthAction} className="space-y-5">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="text" 
                          required 
                          className="w-full pl-12 pr-6 py-4 bg-white border border-beige-darker rounded-2xl outline-none transition-all font-semibold text-navy focus:ring-4 focus:ring-forest-pale focus:border-forest" 
                          placeholder="Your Display Name" 
                          value={authUsername} 
                          onChange={(e) => setAuthUsername(e.target.value)} 
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="email" required className="w-full pl-12 pr-6 py-4 bg-white border border-beige-darker rounded-2xl outline-none transition-all font-semibold text-navy focus:ring-4 focus:ring-forest-pale focus:border-forest" placeholder="name@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <input type="password" required className="w-full px-6 py-4 bg-white border border-beige-darker rounded-2xl outline-none transition-all font-semibold text-navy focus:ring-4 focus:ring-forest-pale focus:border-forest" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
                  </div>
                  {authError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl animate-in shake-in border border-red-100">{authError}</div>}
                  <button type="submit" disabled={authLoading} className="w-full py-5 bg-forest text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-forest/10 hover:bg-forest-hover transition-all active:scale-[0.98]">
                    {authLoading ? <Loader2 className="animate-spin" /> : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
                <div className="pt-6 border-t border-beige-darker text-center">
                  <p className="text-sm font-medium text-slate-500">
                    {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                    <button type="button" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="ml-2 text-forest font-bold hover:underline transition-all">
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
        {currentPage === 'home' && <Home onSongClick={navigateToDetail} onGlobalSearch={(t) => { setGlobalSearchTerm(t); setCurrentPage('results'); }} isLoggedIn={isLoggedIn} />}
        {currentPage === 'results' && <SearchResults searchTerm={globalSearchTerm} onSongClick={navigateToDetail} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        {currentPage === 'detail' && selectedSongId && <SongDetail songId={selectedSongId} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        {currentPage === 'admin' && <AdminPanel />}
        {currentPage === 'favorites' && <Favorites onSongClick={navigateToDetail} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
      </main>

      <footer className="bg-white border-t border-beige-darker py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Logo />
            <p className="text-slate-500 text-sm font-medium max-w-sm text-center md:text-left leading-relaxed">
              LeGe's Archive is dedicated to preserving the musical legacy of our community.
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Connect with us</h4>
            <a href="https://www.facebook.com/profile.php?id=61583651651181" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-6 py-3 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl font-bold text-sm hover:bg-[#1877F2] hover:text-white transition-all shadow-sm border border-transparent hover:border-[#1877F2]/20">
              <Facebook size={20} className="group-hover:scale-110 transition-transform" />
              LeGe's Facebook
            </a>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            <p>© {new Date().getFullYear()} LeGe's Music Sheets</p>
            <div className="flex items-center gap-2">
              Made with <Heart size={14} className="text-red-400 fill-current" /> for the community
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
