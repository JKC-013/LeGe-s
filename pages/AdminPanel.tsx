
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Upload, 
  UserPlus, 
  Download as DownloadIcon, 
  Plus, 
  FileText,
  Trash2,
  TrendingUp,
  CheckCircle2,
  FileUp,
  Loader2,
  Trophy,
  Search,
  AlertCircle,
  Key
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { Song, Category, Instrument } from '../types';
import { CATEGORIES, INSTRUMENTS } from '../constants';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'upload' | 'add-key' | 'remove' | 'admins'>('analytics');
  const [songs, setSongs] = useState<Song[]>([]);
  const [adminsList, setAdminsList] = useState<{ id: string, email: string }[]>([]);
  const [analyticsCategory, setAnalyticsCategory] = useState<Category | 'All'>('All');
  
  // New Song Form State
  const [newSong, setNewSong] = useState<{
    name: string;
    categories: Category[];
    instrument: Instrument;
    initialKey: string;
  }>({
    name: '',
    categories: [],
    instrument: 'Piano',
    initialKey: 'C'
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Add New Key State
  const [keySearchTerm, setKeySearchTerm] = useState('');
  const [selectedSongToUpdate, setSelectedSongToUpdate] = useState<Song | null>(null);
  const [newVariantKey, setNewVariantKey] = useState('');

  // Remove Song State
  const [removeSearchTerm, setRemoveSearchTerm] = useState('');
  
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    fetchSongs();
    fetchAdmins();
  }, []);

  const fetchSongs = async () => {
    const { data } = await supabase.getSongs();
    setSongs(data || []);
  };

  const fetchAdmins = async () => {
    const { data } = await supabase.getAdmins();
    setAdminsList(data || []);
  };

  const rankedSongs = useMemo(() => {
    let filtered = [...songs];
    if (analyticsCategory !== 'All') {
      filtered = filtered.filter(s => s.categories.includes(analyticsCategory as Category));
    }
    return filtered.sort((a, b) => b.search_count - a.search_count);
  }, [songs, analyticsCategory]);

  const filteredForKeyAddition = useMemo(() => {
    if (!keySearchTerm.trim()) return [];
    return songs.filter(s => s.name.toLowerCase().includes(keySearchTerm.toLowerCase()));
  }, [songs, keySearchTerm]);

  const filteredForRemoval = useMemo(() => {
    if (!removeSearchTerm.trim()) return [];
    return songs.filter(s => s.name.toLowerCase().includes(removeSearchTerm.toLowerCase()));
  }, [songs, removeSearchTerm]);

  const exportToExcel = () => {
    const data = rankedSongs.map((s, idx) => ({
      'Rank': idx + 1,
      'Song Name': s.name,
      'Categories': s.categories.join(', '),
      'Instrument': s.instrument,
      'Total Search': s.search_count,
      'Uploaded At': new Date(s.created_at).toLocaleDateString()
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ranking');
    XLSX.writeFile(workbook, `LeGe_Search_Ranking_${analyticsCategory}_${new Date().getFullYear()}.xlsx`);
  };

  const handleAddCategory = (cat: Category) => {
    if (newSong.categories.includes(cat)) {
      setNewSong(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
    } else {
      setNewSong(prev => ({ ...prev, categories: [...prev.categories, cat] }));
    }
  };

  const handleUploadNewSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.name || newSong.categories.length === 0 || !selectedFile) return;
    
    setIsUploading(true);
    const { url } = await supabase.uploadPDF(selectedFile);
    if (url) {
      await supabase.addSong({ 
        name: newSong.name, 
        categories: newSong.categories, 
        instrument: newSong.instrument,
        variants: [{ key: newSong.initialKey, pdf_url: url }]
      });
      await fetchSongs();
      setNewSong({ name: '', categories: [], instrument: 'Piano', initialKey: 'C' });
      setSelectedFile(null);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
    setIsUploading(false);
  };

  const handleAddNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSongToUpdate || !newVariantKey || !selectedFile) return;

    setIsUploading(true);
    const { url } = await supabase.uploadPDF(selectedFile);
    if (url) {
      await supabase.addKeyToSong(selectedSongToUpdate.id, { key: newVariantKey, pdf_url: url });
      await fetchSongs();
      setSelectedSongToUpdate(null);
      setNewVariantKey('');
      setSelectedFile(null);
      setKeySearchTerm('');
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    }
    setIsUploading(false);
  };

  const handleDeleteSong = async (id: string) => {
    if (window.confirm("Permanently remove this song from the library?")) {
      await supabase.deleteSong(id);
      await fetchSongs();
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;

    await supabase.addAdmin(newAdminEmail);
    setNewAdminEmail('');
    await fetchAdmins();
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleRemoveAdmin = async (email: string) => {
    // Prevent removing core admins
    const protectedEmails = ['admin@lege.music', 'khiemvinhtran1112@gmail.com'];
    if (protectedEmails.includes(email)) {
      alert("This account is protected and cannot be removed.");
      return;
    }

    if (window.confirm(`Revoke admin privileges for ${email}?`)) {
      await supabase.removeAdmin(email);
      await fetchAdmins();
    }
  };

  const inputBaseClass = "w-full px-6 py-4 bg-white border border-[#e2dcd0] rounded-2xl focus:ring-4 focus:ring-forest-pale focus:border-forest outline-none transition-all font-semibold text-navy";
  const searchInputClass = "w-full pl-16 pr-6 py-4 bg-white border border-[#e2dcd0] rounded-2xl focus:ring-4 focus:ring-forest-pale focus:border-forest outline-none transition-all font-semibold text-navy";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          <h2 className="serif text-4xl font-bold mb-8 px-4 text-navy">Admin Hub</h2>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'analytics' ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'hover:bg-forest-pale text-slate-500'}`}
          >
            <LayoutDashboard size={18} />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'upload' ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'hover:bg-forest-pale text-slate-500'}`}
          >
            <Upload size={18} />
            Upload Song
          </button>
          <button 
            onClick={() => setActiveTab('add-key')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'add-key' ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'hover:bg-forest-pale text-slate-500'}`}
          >
            <Key size={18} />
            Add New Key
          </button>
          <button 
            onClick={() => setActiveTab('remove')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'remove' ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'hover:bg-forest-pale text-slate-500'}`}
          >
            <Trash2 size={18} />
            Remove Song
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === 'admins' ? 'bg-forest text-white shadow-lg shadow-forest/20' : 'hover:bg-forest-pale text-slate-500'}`}
          >
            <UserPlus size={18} />
            Manage Admins
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow bg-white border border-beige-darker rounded-[2.5rem] shadow-sm p-10 min-h-[700px]">
          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2 serif text-navy">Search Ranking</h3>
                  <p className="text-sm text-slate-500 font-medium">Discover which sheets are most popular in the community.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-[#fbf9f4] p-1.5 rounded-xl border border-[#e2dcd0]">
                    {['All', ...CATEGORIES].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setAnalyticsCategory(cat as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${analyticsCategory === cat ? 'bg-forest text-white shadow-sm' : 'text-slate-400 hover:bg-forest-pale'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button onClick={exportToExcel} className="flex items-center gap-2 px-5 py-2.5 bg-forest hover:bg-forest-hover text-white rounded-xl transition-colors text-xs font-bold shadow-md">
                    <DownloadIcon size={14} /> Export
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-[#fbf9f4]/50 border border-[#e2dcd0] rounded-3xl group hover:border-forest transition-colors">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Total Sheets</p>
                  <p className="text-5xl font-bold text-navy serif">{songs.length}</p>
                </div>
                <div className="p-8 bg-[#fbf9f4]/50 border border-[#e2dcd0] rounded-3xl group hover:border-forest transition-colors">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Total Search</p>
                  <p className="text-5xl font-bold text-navy serif">{songs.reduce((acc, s) => acc + s.search_count, 0).toLocaleString()}</p>
                </div>
                <div className="p-8 bg-[#fbf9f4]/50 border border-[#e2dcd0] rounded-3xl group hover:border-forest transition-colors overflow-hidden">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Current Category</p>
                  <p className="text-2xl md:text-3xl font-bold text-navy serif truncate">{analyticsCategory}</p>
                </div>
              </div>

              <div className="border border-[#e2dcd0] rounded-3xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#fbf9f4]/80 border-b border-[#e2dcd0]">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-20 text-center">Rank</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Song Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Instrument</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Total Search</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2dcd0]">
                    {rankedSongs.map((song, idx) => (
                      <tr key={song.id} className="hover:bg-forest-pale transition-colors group">
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-navy serif text-lg group-hover:text-forest transition-colors">{song.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{song.categories.join(' • ')}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{song.instrument}</span>
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-forest">{song.search_count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-10 animate-in fade-in duration-300 max-w-2xl">
              <div>
                <h3 className="text-3xl font-bold mb-2 serif text-navy">New Music Sheet</h3>
                <p className="text-sm text-slate-500 font-medium">Create a new entry in the library with its first key variant.</p>
              </div>

              <form onSubmit={handleUploadNewSong} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Song Name</label>
                  <input type="text" required className={inputBaseClass} value={newSong.name} onChange={e => setNewSong(prev => ({ ...prev, name: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button type="button" key={cat} onClick={() => handleAddCategory(cat)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest border ${newSong.categories.includes(cat) ? 'bg-forest text-white border-forest' : 'bg-white text-slate-500 border-[#e2dcd0] hover:bg-forest-pale hover:border-forest/50'}`}>{cat}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Initial Key</label>
                    <input type="text" required className={inputBaseClass} value={newSong.initialKey} onChange={e => setNewSong(prev => ({ ...prev, initialKey: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">Instrument</label>
                    <select className={inputBaseClass} value={newSong.instrument} onChange={e => setNewSong(prev => ({ ...prev, instrument: e.target.value as Instrument }))}>
                      {INSTRUMENTS.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">PDF File</label>
                  <div className={`relative p-10 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:bg-forest-pale ${selectedFile ? 'border-forest bg-forest-pale' : 'border-[#e2dcd0] bg-white'}`}>
                    <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <FileUp size={40} className={selectedFile ? 'text-forest' : 'text-slate-300'} />
                    <p className="text-base font-bold text-navy">{selectedFile ? selectedFile.name : 'Upload PDF File'}</p>
                    {selectedFile && <p className="text-[10px] text-forest font-bold uppercase">Ready to upload</p>}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isUploading || !selectedFile} 
                  className={`w-full py-5 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white rounded-2xl font-bold text-lg shadow-xl shadow-forest/10 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed`}
                >
                  {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                  {isUploading ? 'Uploading Sheet...' : 'Create Song Entry'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'add-key' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div>
                <h3 className="text-3xl font-bold mb-2 serif text-navy">Add New Key</h3>
                <p className="text-sm text-slate-500 font-medium">Find an existing song to add a different musical key variant.</p>
              </div>

              {!selectedSongToUpdate ? (
                <div className="space-y-6">
                  <div className="max-w-xl relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-forest transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="Search for the song you want to update"
                      className={searchInputClass} 
                      value={keySearchTerm} 
                      onChange={(e) => setKeySearchTerm(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {filteredForKeyAddition.map(song => (
                      <div 
                        key={song.id} 
                        onClick={() => setSelectedSongToUpdate(song)}
                        className="flex items-center justify-between p-6 bg-white border border-[#e2dcd0] rounded-3xl group cursor-pointer hover:border-forest hover:bg-forest-pale transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-forest-pale rounded-xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-white transition-colors">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-navy text-xl serif leading-tight group-hover:text-forest transition-colors">{song.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Current Keys: {song.variants.map(v => v.key).join(', ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-6 py-3 bg-forest text-white rounded-2xl text-xs font-bold shadow-lg shadow-forest/10 hover:bg-forest-hover active:scale-[0.98] transition-all">
                          Select Song
                        </div>
                      </div>
                    ))}
                    {keySearchTerm.trim() && filteredForKeyAddition.length === 0 && (
                      <div className="py-12 text-center text-slate-400">No songs found matching "{keySearchTerm}"</div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddNewKey} className="space-y-8 max-w-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-8 bg-forest-pale border border-forest/20 rounded-3xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[10px] text-forest font-bold uppercase tracking-widest mb-1">Adding key variant for</p>
                      <p className="text-3xl font-bold text-navy serif leading-tight">{selectedSongToUpdate.name}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedSongToUpdate(null)} className="px-4 py-2 border border-beige-darker bg-white rounded-xl text-[10px] font-bold text-slate-400 hover:text-forest hover:border-forest uppercase transition-all">Change</button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">New Key Name (e.g. Ab, G#m, D)</label>
                    <input type="text" required className={inputBaseClass} value={newVariantKey} onChange={e => setNewVariantKey(e.target.value)} />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest ml-1">PDF File for Key {newVariantKey || '...'}</label>
                    <div className={`relative p-12 border-2 border-dashed rounded-3xl transition-all flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:bg-forest-pale group ${selectedFile ? 'border-forest bg-forest-pale' : 'border-[#e2dcd0] bg-white'}`}>
                      <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className={`p-4 rounded-2xl transition-colors ${selectedFile ? 'bg-forest text-white' : 'bg-beige-light text-slate-300 group-hover:text-forest'}`}>
                        <FileUp size={48} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-navy">{selectedFile ? selectedFile.name : 'Upload PDF File'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select the music score in the new key</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUploading || !selectedFile || !newVariantKey} 
                    className="w-full py-5 bg-forest hover:bg-forest-hover active:scale-[0.99] text-white rounded-2xl font-bold text-lg shadow-xl shadow-forest/10 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-3"
                  >
                    {isUploading ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                    {isUploading ? 'Uploading Variant...' : `Add Key ${newVariantKey} to Song`}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'remove' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div>
                <h3 className="text-3xl font-bold mb-2 serif text-navy">Remove Music Sheet</h3>
                <p className="text-sm text-slate-500 font-medium">Search for a sheet by name to permanently remove it from the library.</p>
              </div>

              <div className="max-w-xl relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-forest transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search for the song you want to delete"
                  className={searchInputClass} 
                  value={removeSearchTerm} 
                  onChange={(e) => setRemoveSearchTerm(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredForRemoval.map(song => (
                  <div key={song.id} className="flex items-center justify-between p-6 bg-white border border-[#e2dcd0] rounded-3xl group hover:border-red-300 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-forest-pale rounded-xl flex items-center justify-center text-forest">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-navy text-lg serif group-hover:text-red-600 transition-colors">{song.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{song.instrument} • {song.variants.length} keys</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteSong(song.id)} className="px-6 py-2.5 border border-red-100 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div>
                <h3 className="text-3xl font-bold mb-2 serif text-navy">Admin Access</h3>
                <p className="text-sm text-slate-500 font-medium">Grant admin privileges to other community members.</p>
              </div>
              <form onSubmit={handleAddAdmin} className="flex gap-4 max-w-lg">
                <input 
                  type="email" 
                  required 
                  placeholder="Enter the email address for the new admin"
                  className={inputBaseClass} 
                  value={newAdminEmail} 
                  onChange={e => setNewAdminEmail(e.target.value)} 
                />
                <button type="submit" className="px-8 py-4 bg-forest hover:bg-forest-hover active:scale-[0.98] text-white rounded-2xl font-bold whitespace-nowrap shadow-lg shadow-forest/10 transition-all">Add Admin</button>
              </form>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Current Privileged Users</h4>
                <div className="grid grid-cols-1 gap-3">
                  {adminsList.map(admin => (
                    <div key={admin.id || admin.email} className="flex items-center justify-between p-6 bg-white border border-[#e2dcd0] rounded-3xl hover:border-forest/20 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-forest text-white flex items-center justify-center text-sm font-bold shadow-md">
                          {admin.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-navy text-lg">{admin.email}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Full Access Permissions</p>
                        </div>
                      </div>
                      {/* Only show delete if it's not a protected admin */}
                      {!['admin@lege.music', 'khiemvinhtran1112@gmail.com'].includes(admin.email) && (
                        <button 
                          onClick={() => handleRemoveAdmin(admin.email)}
                          className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={22} />
                        </button>
                      )}
                    </div>
                  ))}
                  {adminsList.length === 0 && (
                    <div className="py-12 text-center text-slate-400 italic">No additional admins assigned.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="fixed bottom-10 right-10 bg-forest text-white px-8 py-4 rounded-2xl shadow-2xl font-bold animate-in slide-in-from-right-8 duration-300 flex items-center gap-3 z-[100]">
              <CheckCircle2 size={24} /> Action successful!
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
