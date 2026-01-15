import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Users, 
  Plus, 
  Trash2,
  CheckCircle2,
  FileUp,
  Loader2,
  Search,
  Key,
  XCircle,
  ShieldAlert,
  UserCheck,
  AlertCircle,
  Mail,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song, Instrument, UserProfile } from '../types';
import { CATEGORIES, INSTRUMENTS } from '../constants';
import { useDebounce } from '../hooks/useDebounce';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'add-key' | 'remove' | 'access'>('upload');
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [privilegedEmails, setPrivilegedEmails] = useState<Set<string>>(new Set());
  const [newSong, setNewSong] = useState({ name: '', categories: [] as string[], instrument: 'Piano' as Instrument, initialKey: 'C' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal State
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const [keySearchTerm, setKeySearchTerm] = useState('');
  const [removeSearchTerm, setRemoveSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedSongToUpdate, setSelectedSongToUpdate] = useState<Song | null>(null);
  const [newVariantKey, setNewVariantKey] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const debouncedKeySearch = useDebounce(keySearchTerm, 300);
  const debouncedRemoveSearch = useDebounce(removeSearchTerm, 300);
  const debouncedUserSearch = useDebounce(userSearchTerm, 300);

  useEffect(() => {
    setKeySearchTerm('');
    setRemoveSearchTerm('');
    setUserSearchTerm('');
    setErrorMessage(null);
    setWarningMessage(null);
    setSelectedSongToUpdate(null);
    setSelectedFile(null);
    setSongToDelete(null); // Ensure modal is closed on tab switch
    
    fetchSongs();
    if (activeTab === 'access') fetchUsersData();
  }, [activeTab]);

  const fetchSongs = async () => {
    setIsLoadingSongs(true);
    const { data } = await supabase.getSongs();
    setSongs(data || []);
    setIsLoadingSongs(false);
  };

  const fetchUsersData = async () => {
    const { data: adminData } = await supabase.getPrivilegedUsers();
    setPrivilegedEmails(new Set((adminData || []).map((u: any) => String(u.email))));
    const { data: profiles, error } = await supabase.getProfiles();
    if (!error) {
      setAllProfiles(profiles || []);
    }
  };

  const filteredForKeyAddition = useMemo(() => {
    const term = debouncedKeySearch.trim().toLowerCase();
    if (!term) return []; 
    return songs.filter(s => s.name.toLowerCase().includes(term));
  }, [songs, debouncedKeySearch]);

  const filteredForRemoval = useMemo(() => {
    const term = debouncedRemoveSearch.trim().toLowerCase();
    if (!term) return [];
    return songs.filter(s => s.name.toLowerCase().includes(term));
  }, [songs, debouncedRemoveSearch]);

  const filteredUsersSearchResult = useMemo(() => {
    const term = debouncedUserSearch.trim().toLowerCase();
    if (!term) return [];
    return allProfiles.filter(u => u.email.toLowerCase().includes(term)).slice(0, 10);
  }, [allProfiles, debouncedUserSearch]);

  const handleUploadNewSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage(null);
    const { url, error } = await supabase.uploadPDF(selectedFile);
    if (!error && url) {
      const { error: dbError } = await supabase.addSong({ 
        name: newSong.name, 
        categories: newSong.categories as any, 
        instrument: newSong.instrument,
        variants: [{ key: newSong.initialKey, pdf_url: url }] 
      });
      if (dbError) {
        setErrorMessage(dbError.message);
        await supabase.deleteFile(url);
      } else {
        fetchSongs();
        setNewSong({ name: '', categories: [], instrument: 'Piano', initialKey: 'C' });
        setSelectedFile(null);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      }
    } else {
      setErrorMessage(error?.message || "Storage upload error");
    }
    setIsUploading(false);
  };

  const handleGrantAccess = async (email: string) => {
    setErrorMessage(null);
    const { success, error } = await supabase.grantAdminAccess(email);
    if (success) {
      setUserSearchTerm('');
      fetchUsersData();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } else {
      setErrorMessage(error?.message || "Request failed.");
    }
  };

  const handleAddKeyVariation = async () => {
    if (!selectedFile || !selectedSongToUpdate || !newVariantKey) return;
    setIsUploading(true);
    setErrorMessage(null);
    
    const { url, error: uploadError } = await supabase.uploadPDF(selectedFile);
    if (url) {
      const { success, error: dbError } = await supabase.addKeyToSong(selectedSongToUpdate.id, {
        key: newVariantKey, 
        pdf_url: url
      });
      
      if (success) {
        fetchSongs();
        setSelectedSongToUpdate(null);
        setNewVariantKey('');
        setSelectedFile(null);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        await supabase.deleteFile(url);
        setErrorMessage(dbError?.message || "Failed to link key variation to song.");
      }
    } else {
      setErrorMessage(uploadError?.message || "Storage upload error");
    }
    setIsUploading(false);
  };

  const promptDelete = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    setSongToDelete(song);
    setErrorMessage(null);
    setWarningMessage(null);
  };

  const performDelete = async () => {
    if (!songToDelete) return;
    setIsDeletingId(songToDelete.id);
    
    try {
      const { success, error, storageError } = await supabase.deleteSong(songToDelete.id);
      
      if (success) {
        setSongs(prev => prev.filter(s => s.id !== songToDelete.id));
        setSongToDelete(null); // Close modal
        
        if (storageError) {
            setWarningMessage("Song deleted, but files remain in storage. Please check permissions.");
        } else {
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);
        }
      } else {
        const msg = error || "Failed to delete song. Please check permissions.";
        setErrorMessage(msg);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const inputBaseClass = "w-full px-6 py-4 bg-white border border-[#e2dcd0] rounded-2xl focus:ring-4 focus:ring-forest-pale focus:border-forest outline-none transition-all font-semibold text-navy shadow-sm";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 space-y-2">
          <h2 className="serif text-4xl font-bold mb-8 px-4 text-navy">Admin Hub</h2>
          <nav className="flex flex-col gap-1">
            {['upload', 'add-key', 'remove', 'access'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-sm capitalize ${activeTab === t ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'hover:bg-forest-pale text-slate-500'}`}>
                {t === 'upload' && <Upload size={18} />}
                {t === 'add-key' && <Key size={18} />}
                {t === 'remove' && <Trash2 size={18} />}
                {t === 'access' && <Users size={18} />}
                {t.replace('-', ' ')}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-grow bg-white border border-beige-darker rounded-[2.5rem] shadow-sm p-10 min-h-[700px] relative">
          {isSuccess && <div className="fixed top-24 right-8 bg-forest text-white px-6 py-3 rounded-xl shadow-xl font-bold animate-in fade-in z-[100] flex items-center gap-2"><CheckCircle2 size={18}/> Operation Successful</div>}
          {errorMessage && <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in shake-in"><XCircle size={18} /> {errorMessage}</div>}
          {warningMessage && <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-600 text-sm font-bold animate-in slide-in-from-top-2"><AlertTriangle size={18} /> {warningMessage}</div>}

          {/* Delete Confirmation Modal */}
          {songToDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full border border-beige-darker space-y-6 animate-in zoom-in-95">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold serif text-navy">Delete Music Sheet?</h3>
                  <p className="text-slate-500 font-medium text-sm">
                    You are about to permanently delete <br/>
                    <span className="text-navy font-bold">"{songToDelete.name}"</span>
                  </p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-xl flex gap-3 items-start text-red-600 text-xs font-bold leading-relaxed">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>This action cannot be undone. All associated PDF files and variants will be removed from storage immediately.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setSongToDelete(null)}
                    disabled={isDeletingId === songToDelete.id}
                    className="py-3 px-4 bg-white border border-beige-darker text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={performDelete}
                    disabled={isDeletingId === songToDelete.id}
                    className="py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeletingId === songToDelete.id ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <form onSubmit={handleUploadNewSong} className="space-y-8 max-w-2xl">
              <div>
                <h3 className="text-3xl font-bold serif text-navy">New Music Sheet</h3>
                <p className="text-sm text-slate-400 mt-1">Add a new song entry and its initial music score key.</p>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Song Name" required className={inputBaseClass} value={newSong.name} onChange={e => setNewSong(prev => ({ ...prev, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Initial Key (e.g. C)" required className={inputBaseClass} value={newSong.initialKey} onChange={e => setNewSong(prev => ({ ...prev, initialKey: e.target.value }))} />
                  <select className={inputBaseClass} value={newSong.instrument} onChange={e => setNewSong(prev => ({ ...prev, instrument: e.target.value as Instrument }))}>
                    {INSTRUMENTS.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Music Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      type="button" 
                      key={cat} 
                      onClick={() => setNewSong(prev => ({ 
                        ...prev, 
                        categories: prev.categories.includes(cat) ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] 
                      }))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${newSong.categories.includes(cat) ? 'bg-forest text-white border-forest' : 'bg-white text-slate-500 border-beige-darker hover:bg-forest-pale'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Upload PDF Score</label>
                <div className={`relative p-12 border-2 border-dashed rounded-3xl text-center transition-all ${selectedFile ? 'border-forest bg-forest-pale' : 'border-beige-darker hover:bg-slate-50'}`}>
                  <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <FileUp size={40} className={`mx-auto mb-3 ${selectedFile ? 'text-forest' : 'text-slate-300'}`} />
                  <p className="font-bold text-navy">{selectedFile ? selectedFile.name : 'Choose Score PDF'}</p>
                  <p className="text-xs text-slate-400 mt-1">High quality PDFs recommended</p>
                </div>
              </div>
              <button disabled={isUploading || !selectedFile || !newSong.name} className="w-full py-5 bg-forest text-white rounded-2xl font-bold shadow-xl shadow-forest/10 hover:bg-forest-hover transition-all flex items-center justify-center gap-3">
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                {isUploading ? 'Uploading Score...' : 'Create Music Entry'}
              </button>
            </form>
          )}

          {activeTab === 'access' && (
            <div className="space-y-10">
              <div>
                <h3 className="text-3xl font-bold serif text-navy">Manage Access</h3>
                <p className="text-sm text-slate-400 mt-1">Promote registered users to administrators.</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search User Email</label>
                <div className="relative flex items-center">
                  <Search className="absolute left-6 text-slate-400" size={22} />
                  <input 
                    type="text" 
                    placeholder="Enter email to search user account..." 
                    className={`${inputBaseClass} pl-16`} 
                    value={userSearchTerm} 
                    onChange={e => setUserSearchTerm(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 mt-2">
                  {filteredUsersSearchResult.map(user => {
                    const isAdmin = privilegedEmails.has(user.email) || user.email === 'khiemvinhtran1112@gmail.com';
                    return (
                      <div key={user.id} className="flex items-center justify-between p-5 bg-white border border-beige-darker rounded-2xl animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-full ${isAdmin ? 'bg-forest/10 text-forest' : 'bg-slate-100 text-slate-400'}`}>
                            <Mail size={16} />
                          </div>
                          <span className="font-bold text-navy">{user.email}</span>
                        </div>
                        {isAdmin ? (
                          <div className="px-4 py-2 bg-forest-pale text-forest rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={14} /> Admin
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleGrantAccess(user.email)}
                            className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest-hover transition-all flex items-center gap-2"
                          >
                            <UserCheck size={14} /> Promote
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={14} /> Active Administrators
                </h4>
                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                  {[...privilegedEmails].sort().map((email: string) => (
                    <div key={email} className={`flex items-center justify-between p-5 border rounded-3xl bg-white border-beige-darker shadow-sm`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold uppercase">{email[0]}</div>
                        <p className="font-bold text-navy">{email}</p>
                      </div>
                      {email !== 'khiemvinhtran1112@gmail.com' && (
                        <button 
                          onClick={() => supabase.revokeAdminAccess(email).then(() => fetchUsersData())} 
                          className="px-4 py-2 bg-white border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'remove' && (
            <div className="space-y-10">
              <h3 className="text-3xl font-bold serif text-navy">Remove Music Sheets</h3>
              <div className="relative flex items-center">
                <Search className="absolute left-6 text-slate-400" size={22} />
                <input 
                  type="text" 
                  placeholder="Search song to remove from library..." 
                  className={`${inputBaseClass} pl-16`}
                  value={removeSearchTerm} 
                  onChange={(e) => setRemoveSearchTerm(e.target.value)} 
                />
              </div>

              {isLoadingSongs ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="animate-spin text-forest" size={32} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading library...</p>
                </div>
              ) : removeSearchTerm.trim() === '' ? (
                <div className="py-24 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-slate-50">
                  <Search className="mx-auto mb-4 text-slate-300" size={48} />
                  <p className="text-xl font-bold text-navy serif">Type to start searching</p>
                  <p className="text-slate-400 text-sm mt-1">Enter a song title above to manage removals.</p>
                </div>
              ) : filteredForRemoval.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {filteredForRemoval.map(song => (
                    <div key={song.id} className="flex items-center justify-between p-6 bg-white border border-[#e2dcd0] rounded-2xl shadow-sm hover:border-red-200 transition-all animate-in fade-in">
                      <div>
                        <p className="font-bold text-navy serif text-xl">{song.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{song.instrument} • {song.variants.length} keys</p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => promptDelete(e, song)} 
                        disabled={isDeletingId === song.id}
                        className="px-6 py-2 bg-red-50 text-red-500 font-bold hover:bg-red-600 hover:text-white active:scale-95 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-transparent hover:border-red-600 shadow-sm"
                      >
                        {isDeletingId === song.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {isDeletingId === song.id ? 'Deleting...' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-slate-50">
                  <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                  <p className="text-xl font-bold text-navy serif">No matching results found</p>
                  <p className="text-slate-400 text-sm mt-1">We couldn't find any songs matching "{removeSearchTerm}".</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'add-key' && (
            <div className="space-y-10">
              <h3 className="text-3xl font-bold serif text-navy">Add Key Variation</h3>
              {!selectedSongToUpdate ? (
                <div className="space-y-6">
                  <div className="relative flex items-center">
                    <Search className="absolute left-6 text-slate-400" size={22} />
                    <input 
                      type="text" 
                      placeholder="Search song title to update..." 
                      className={`${inputBaseClass} pl-16`} 
                      value={keySearchTerm} 
                      onChange={e => setKeySearchTerm(e.target.value)} 
                    />
                  </div>
                  
                  {isLoadingSongs ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <Loader2 className="animate-spin text-forest" size={32} />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading library...</p>
                    </div>
                  ) : keySearchTerm.trim() === '' ? (
                    <div className="py-24 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-slate-50">
                      <Search className="mx-auto mb-4 text-slate-300" size={48} />
                      <p className="text-xl font-bold text-navy serif">Search for a song</p>
                      <p className="text-slate-400 text-sm mt-1">Enter a title to add or update music sheet variations.</p>
                    </div>
                  ) : filteredForKeyAddition.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredForKeyAddition.map(song => (
                        <button 
                          key={song.id} 
                          onClick={() => setSelectedSongToUpdate(song)} 
                          className="flex items-center justify-between p-5 bg-white border border-beige-darker rounded-2xl text-left hover:border-forest hover:bg-forest-pale/30 transition-all group/item"
                        >
                          <p className="font-bold text-navy group-hover/item:text-forest transition-colors">{song.name}</p>
                          <div className="p-2 bg-slate-50 group-hover/item:bg-forest rounded-lg text-slate-300 group-hover/item:text-white transition-all">
                            <Plus size={18} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-slate-50">
                      <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                      <p className="text-xl font-bold text-navy serif">No matching songs found</p>
                      <p className="text-slate-400 text-sm mt-1">Try a different search term.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 max-w-xl animate-in slide-in-from-left duration-300">
                  <div className="p-6 bg-forest-pale border border-forest/20 rounded-2xl flex justify-between items-center shadow-sm">
                    <p className="font-bold text-navy serif text-2xl">{selectedSongToUpdate.name}</p>
                    <button 
                      onClick={() => setSelectedSongToUpdate(null)} 
                      className="px-4 py-2 text-xs font-bold text-forest bg-white border border-forest/20 rounded-xl"
                    >
                      Change
                    </button>
                  </div>
                  <input type="text" placeholder="New Key (e.g. Eb)" className={inputBaseClass} value={newVariantKey} onChange={e => setNewVariantKey(e.target.value)} />
                  <div className={`relative p-10 border-2 border-dashed rounded-3xl text-center transition-all ${selectedFile ? 'border-forest bg-forest-pale' : 'border-beige-darker'}`}>
                    <input type="file" accept=".pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <p className="text-sm font-bold text-navy">{selectedFile ? selectedFile.name : 'Upload PDF for this key'}</p>
                  </div>
                  <button 
                    onClick={handleAddKeyVariation} 
                    disabled={isUploading || !selectedFile || !newVariantKey} 
                    className="w-full py-5 bg-forest text-white rounded-2xl font-bold shadow-xl shadow-forest/10 hover:bg-forest-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                    {isUploading ? 'Adding Variation...' : 'Save Key Variation'}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;