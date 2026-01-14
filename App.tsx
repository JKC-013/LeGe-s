
import React, { useState, useEffect } from 'react';
import { User, LayoutDashboard, Facebook, Star, LogIn, Loader2, AlertCircle, X, Mail, Lock, UserPlus } from 'lucide-react';
import Logo from './components/Logo';
import Home from './pages/Home';
import SongDetail from './pages/SongDetail';
import AdminPanel from './pages/AdminPanel';
import SearchResults from './pages/SearchResults';
import Favorites from './pages/Favorites';
import { supabase } from './lib/supabase';
import { AuthUser } from './types';

type Page = 'home' | 'detail' | 'admin' | 'results' | 'favorites';
type AuthMode = 'signin' | 'signup';

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
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL for auth parameters to handle reloads
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
      const authUser = await supabase.setSessionUser(session);
      setUser(authUser);
      if (event === 'SIGNED_OUT') setCurrentPage('home');
      
      // Clear auth params on successful login
      if (event === 'SIGNED_IN') {
        const params = new URLSearchParams(window.location.search);
        if (params.has('auth')) {
          params.delete('auth');
          const newSearch = params.toString();
          const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
          window.history.replaceState({}, '', newUrl);
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
        if (error) throw error;
        setIsAuthModalOpen(false);
      } else {
        const { error } = await supabase.signUpWithEmail(authEmail, authPassword);
        if (error) throw error;
        alert("Success! Please check your email for a confirmation link. IMPORTANT: Make sure you have set the correct 'Site URL' in your Supabase Auth dashboard to avoid localhost redirect errors.");
        handleSwitchAuthMode('signin');
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred during authentication.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Pure state opening - stable, no reload
  const handleOpenAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    // Sync URL without reload just in case user refreshes later
    const params = new URLSearchParams(window.location.search);
    params.set('auth', mode);
    const newUrl = window.location.pathname + '?' + params.toString();
    window.history.replaceState({}, '', newUrl);
  };

  // Forced reload for switching - as requested
  const handleSwitchAuthMode = (mode: AuthMode) => {
    const params = new URLSearchParams(window.location.search);
    params.set('auth', mode);
    // Explicitly use the current path to prevent environment navigation errors
    const targetUrl = window.location.pathname + '?' + params.toString();
    window.location.href = targetUrl;
  };

  const closeAuthModal = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('auth');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
    window.history.replaceState({}, '', newUrl);
    setIsAuthModalOpen(false);
  };

  const handleLoginDemoAdmin = async () => {
    const { user: newUser } = await supabase.loginAsAdmin();
    setUser(newUser);
    closeAuthModal();
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    await supabase.logout();
    setUser(null);
    setCurrentPage('home');
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
        <div className="flex flex-col items-center gap-6">
          <Logo className="h-16 animate-pulse" />
          <div className="flex items-center gap-3 text-forest font-bold uppercase tracking-widest text-xs">
            <Loader2 className="animate-spin" size={18} />
            Connecting to LeGe's...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#fbf9f4]/90 backdrop-blur-xl border-b border-beige-darker py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="cursor-pointer" onClick={navigateToHome}>
            <Logo />
          </div>
          
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
              <button 
                onClick={() => setCurrentPage('admin')}
                className={`p-2 rounded-lg transition-colors ${currentPage === 'admin' ? 'text-forest bg-forest/5' : 'text-slate-400 hover:text-forest hover:bg-forest-pale'}`}
                title="Admin Panel"
              >
                <LayoutDashboard size={22} />
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-5 border-l border-beige-darker pl-6">
                <button onClick={handleLogout} className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors">Logout</button>
                <div className="w-9 h-9 rounded-full bg-forest text-white flex items-center justify-center border border-forest/10 shadow-sm overflow-hidden text-sm font-bold uppercase">
                  {user.email?.[0] || <User size={18} />}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => handleOpenAuth('signin')} 
                className="px-6 py-2.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-hover transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <LogIn size={18} /> Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-beige-bg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <button 
              onClick={closeAuthModal}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <div className="p-10 space-y-8">
              <div className="text-center space-y-2">
                <Logo className="mx-auto h-12" />
                <h2 className="text-3xl font-bold serif text-navy mt-4">
                  {authMode === 'signin' ? 'Welcome Back' : 'Join Our Community'}
                </h2>
                <p className="text-sm text-slate-500 font-medium italic">
                  {authMode === 'signin' ? 'Sign in to access your saved scores' : 'Create an account to start your music journey'}
                </p>
              </div>

              <form onSubmit={handleAuthAction} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-forest transition-colors" size={18} />
                    <input 
                      type="email" 
                      required 
                      className="w-full pl-12 pr-6 py-4 bg-white border border-beige-darker rounded-2xl focus:ring-4 focus:ring-forest-pale focus:border-forest outline-none transition-all font-semibold text-navy"
                      placeholder="name@example.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-forest transition-colors" size={18} />
                    <input 
                      type="password" 
                      required 
                      className="w-full pl-12 pr-6 py-4 bg-white border border-beige-darker rounded-2xl focus:ring-4 focus:ring-forest-pale focus:border-forest outline-none transition-all font-semibold text-navy"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in shake-in">
                    <AlertCircle size={16} />
                    {authError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full py-5 bg-forest hover:bg-forest-hover active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-xl shadow-forest/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {authLoading ? <Loader2 className="animate-spin" /> : authMode === 'signin' ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="pt-6 border-t border-beige-darker text-center space-y-4">
                <p className="text-sm font-medium text-slate-500">
                  {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    type="button"
                    onClick={() => handleSwitchAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="ml-2 text-forest font-bold hover:underline"
                  >
                    {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
                <button 
                  type="button"
                  onClick={handleLoginDemoAdmin}
                  className="text-[10px] uppercase tracking-widest font-black text-slate-300 hover:text-navy transition-colors"
                >
                  Bypass with Demo Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow">
        {currentPage === 'home' && <Home onSongClick={navigateToDetail} onGlobalSearch={(t) => { setGlobalSearchTerm(t); setCurrentPage('results'); }} isLoggedIn={isLoggedIn} />}
        {currentPage === 'results' && <SearchResults searchTerm={globalSearchTerm} onSongClick={navigateToDetail} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        {currentPage === 'detail' && selectedSongId && <SongDetail songId={selectedSongId} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        {currentPage === 'admin' && <AdminPanel />}
        {currentPage === 'favorites' && <Favorites onSongClick={navigateToDetail} onBack={navigateToHome} isLoggedIn={isLoggedIn} />}
        
        {!user && !isAuthModalOpen && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-beige-darker p-5 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-bottom-8 duration-500 z-50">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-forest" />
              <p className="text-sm font-semibold text-slate-600">Sign in to start downloading sheets!</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleOpenAuth('signin')} 
                className="px-5 py-2.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-hover shadow-sm active:scale-95 transition-all"
              >
                Sign In / Sign Up
              </button>
              <button onClick={handleLoginDemoAdmin} className="px-5 py-2.5 border-2 border-beige-darker rounded-xl text-sm font-bold hover:bg-beige-dark transition-all text-navy">Admin Demo</button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#fbf9f4] border-t border-beige-darker py-16 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-6 max-w-sm">
            <Logo />
            <p className="text-sm text-slate-500 leading-relaxed font-medium">Dedicated to high-quality music sheets for our Christian community.</p>
          </div>
          <div className="min-w-[200px]">
            <p className="text-navy font-bold text-sm tracking-widest uppercase mb-6">Community</p>
            <a href="https://facebook.com/legesmusicsheets" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm font-semibold text-slate-500 hover:text-forest transition-colors group">
              <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-forest group-hover:text-white transition-colors"><Facebook size={18} /></div>
              Facebook Fanpage
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
