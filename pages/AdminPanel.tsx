
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
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song, Instrument, UserProfile } from '../types';
import { CATEGORIES, INSTRUMENTS } from '../constants';
import { useDebounce } from '../hooks/useDebounce';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'add-key' | 'remove' | 'access'>('upload');
  const [songs, setSongs] = useState<Song[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [privilegedEmails, setPrivilegedEmails] = useState<Set<string>>(new Set());
  const [newSong, setNewSong] = useState({ name: '', categories: [] as string[], instrument: 'Piano' as Instrument, initialKey: 'C' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [keySearchTerm, setKeySearchTerm] = useState('');
  const [removeSearchTerm, setRemoveSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedSongToUpdate, setSelectedSongToUpdate] = useState<Song | null>(null);
  const [newVariantKey, setNewVariantKey] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debouncedKeySearch = useDebounce(keySearchTerm, 300);
  const debouncedRemoveSearch = useDebounce(removeSearchTerm, 300);
  const debouncedUserSearch = useDebounce(userSearchTerm, 300);

  useEffect(() => {
    fetchSongs();
    fetchUsersData();
  }, []);

  const fetchSongs = async () => {
    const { data } = await supabase.getSongs();
    setSongs(data || []);
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
    if (!debouncedKeySearch.trim()) return [];
    return songs.filter(s => s.name.toLowerCase().includes(debouncedKeySearch.toLowerCase()));
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
      } else {
        fetchSongs();
        setNewSong({ name: '', categories: [], instrument: 'Piano', initialKey: 'C' });
        setSelectedFile(null);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      }
    } else {
      setErrorMessage(error?.message || "Storage error");
    }
    setIsUploading(false);
  };

  const handleGrantAccess = async (email: string) => {
    setErrorMessage(null);
    const { success, error } = await supabase.grantAdminAccess(email);
    if (success) {
      setNewUserEmail('');
      setUserSearchTerm('');
      fetchUsersData();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } else {
      setErrorMessage(error?.message || "Request failed.");
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
          {isSuccess && <div className="absolute top-4 right-4 bg-forest text-white px-6 py-3 rounded-xl shadow-xl font-bold animate-in fade-in z-[100] flex items-center gap-2"><CheckCircle2 size={18}/> Operation Successful</div>}
          {errorMessage && <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in shake-in"><XCircle size={18} /> {errorMessage}</div>}

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
                <p className="text-sm text-slate-400 mt-1">Promote registered users to administrators. Only existing accounts can be promoted.</p>
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
                          <div className="flex flex-col">
                            <span className="font-bold text-navy">{user.email}</span>
                            {isAdmin && <span className="text-[9px] font-bold text-forest uppercase tracking-widest">Already an administrator</span>}
                          </div>
                        </div>
                        {isAdmin ? (
                          <div className="px-4 py-2 bg-forest-pale text-forest rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={14} /> Admin Account
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleGrantAccess(user.email)}
                            className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest-hover transition-all flex items-center gap-2"
                          >
                            <UserCheck size={14} /> Promote to Admin
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {debouncedUserSearch.trim() && filteredUsersSearchResult.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-beige-darker rounded-[2rem] bg-slate-50/50">
                      <AlertCircle className="mx-auto mb-4 text-slate-200" size={48} />
                      <p className="text-lg font-bold text-navy serif">No matching users found</p>
                      <p className="text-slate-400 text-sm font-medium mt-1">The user must have a LeGe's account before being promoted.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={14} /> Active Administrators ({privilegedEmails.size + 1})
                </h4>
                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                  {/* Root Admin First */}
                  <div className="flex items-center justify-between p-5 border rounded-3xl bg-forest/5 border-forest/30 shadow-sm opacity-80">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-forest text-white flex items-center justify-center font-bold uppercase">K</div>
                      <div>
                        <p className="font-bold text-navy">khiemvinhtran1112@gmail.com</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-forest">Root Administrator</span>
                      </div>
                    </div>
                  </div>
                  
                  {[...privilegedEmails].filter(email => email !== 'khiemvinhtran1112@gmail.com').sort().map((email: string) => (
                    <div key={email} className={`flex items-center justify-between p-5 border rounded-3xl bg-white border-beige-darker shadow-sm`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold uppercase">{email[0]}</div>
                        <div>
                          <p className="font-bold text-navy">{email}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Admin Level Access</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => supabase.revokeAdminAccess(email).then(() => fetchUsersData())} 
                        className="px-4 py-2 bg-white border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                      >
                        Revoke Access
                      </button>
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

              <div className="grid grid-cols-1 gap-3">
                {filteredForRemoval.map(song => (
                  <div key={song.id} className="flex items-center justify-between p-6 bg-white border border-[#e2dcd0] rounded-2xl animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <p className="font-bold text-navy serif text-xl">{song.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{song.instrument} • {song.variants.length} keys</p>
                    </div>
                    <button onClick={() => { setIsDeletingId(song.id); supabase.deleteSong(song.id).then(() => fetchSongs()); }} className="px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all">
                      {isDeletingId === song.id ? 'Deleting...' : 'Remove'}
                    </button>
                  </div>
                ))}

                {debouncedRemoveSearch.trim() && filteredForRemoval.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-beige-darker rounded-[2rem] bg-white/50">
                    <AlertCircle className="mx-auto mb-4 text-slate-200" size={48} />
                    <p className="text-lg font-bold text-navy serif">No matching results found</p>
                    <p className="text-slate-400 text-sm font-medium mt-1">Check the spelling or try a different title.</p>
                  </div>
                )}
              </div>
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
                  
                  <div className="grid grid-cols-1 gap-2">
                    {filteredForKeyAddition.map(song => (
                      <button 
                        key={song.id} 
                        onClick={() => setSelectedSongToUpdate(song)} 
                        className="flex items-center justify-between p-5 bg-white border border-beige-darker rounded-2xl text-left hover:border-forest hover:bg-forest-pale/30 transition-all group/item"
                      >
                        <div>
                          <p className="font-bold text-navy group-hover/item:text-forest transition-colors">{song.name}</p>
                          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{song.variants.length} existing variations</p>
                        </div>
                        <div className="p-2 bg-slate-50 group-hover/item:bg-forest rounded-lg text-slate-300 group-hover/item:text-white transition-all">
                          <Plus size={18} />
                        </div>
                      </button>
                    ))}

                    {debouncedKeySearch.trim() && filteredForKeyAddition.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-beige-darker rounded-[2.5rem] bg-white/50">
                        <AlertCircle className="mx-auto mb-4 text-slate-200" size={48} />
                        <p className="text-lg font-bold text-navy serif">No matching results found</p>
                        <p className="text-slate-400 text-sm font-medium mt-1">We couldn't find a song with that title.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-xl animate-in zoom-in-95 duration-300">
                  <div className="p-6 bg-forest-pale border border-forest/20 rounded-2xl flex justify-between items-center shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-forest tracking-widest opacity-60">Updating Song</span>
                      <span className="font-bold text-navy serif text-2xl">{selectedSongToUpdate.name}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedSongToUpdate(null)} 
                      className="px-4 py-2 text-xs font-bold text-forest bg-white border border-forest/20 rounded-xl hover:bg-forest hover:text-white transition-all shadow-sm"
                    >
                      Change Song
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Key (e.g. Eb, G#m)</label>
                    <input type="text" placeholder="Key name" className={inputBaseClass} value={newVariantKey} onChange={e => setNewVariantKey(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Score File (PDF)</label>
                    <div className={`relative p-10 border-2 border-dashed rounded-3xl text-center transition-all ${selectedFile ? 'border-forest bg-forest-pale' : 'border-beige-darker hover:border-forest/30'}`}>
                      <input type="file" accept=".pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <FileUp size={32} className={`mx-auto mb-2 ${selectedFile ? 'text-forest' : 'text-slate-300'}`} />
                      <p className="text-sm font-bold text-navy">{selectedFile ? selectedFile.name : 'Upload PDF for this key'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { 
                      if(!selectedFile) return;
                      setIsUploading(true); 
                      supabase.uploadPDF(selectedFile).then(({url}) => {
                        if (url) {
                          supabase.addKeyToSong(selectedSongToUpdate.id, {key: newVariantKey, pdf_url: url}).then(() => { 
                            fetchSongs(); 
                            setSelectedSongToUpdate(null); 
                            setNewVariantKey('');
                            setSelectedFile(null);
                            setIsUploading(false); 
                            setIsSuccess(true); 
                            setTimeout(() => setIsSuccess(false), 3000); 
                          });
                        } else {
                          setIsUploading(false);
                        }
                      });
                    }} 
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
