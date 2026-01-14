
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song, AuthUser, SongVariant } from '../types';

const SUPABASE_URL = 'https://qdgdffcgpwjpjlsecmvk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZ2RmZmNncHdqcGpsc2VjbXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTgzMDksImV4cCI6MjA4MzkzNDMwOX0.-9raxoX8hOgCn2g7oRhGqS6Y5bfc9u0f08S76rWcl7A';

class SupabaseService {
  public client: SupabaseClient;
  private user: AuthUser | null = null;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async signUpWithEmail(email: string, password: string) {
    return await this.client.auth.signUp({
      email,
      password,
    });
  }

  async signInWithEmail(email: string, password: string) {
    return await this.client.auth.signInWithPassword({
      email,
      password,
    });
  }

  async loginAsAdmin() {
    const mockAdmin: AuthUser = { 
      id: 'demo-admin-id', 
      email: 'admin@lege.music', 
      isAdmin: true 
    };
    this.user = mockAdmin;
    return { user: mockAdmin, error: null };
  }

  async logout() {
    await this.client.auth.signOut();
    this.user = null;
  }

  async getSongs() {
    try {
      const { data: authData } = await this.client.auth.getUser();
      const currentUser = authData?.user;

      const { data: songsData, error: songsError } = await this.client
        .from('songs')
        .select(`
          *,
          variants:song_variants(*)
        `)
        .order('created_at', { ascending: false });

      if (songsError) throw songsError;

      let favoriteIds = new Set<string>();
      if (currentUser) {
        const { data: favsData } = await this.client
          .from('user_favorites')
          .select('song_id')
          .eq('user_id', currentUser.id);
        
        if (favsData) {
          favoriteIds = new Set(favsData.map(f => f.song_id));
        }
      }

      const transformedData: Song[] = (songsData || []).map((song: any) => ({
        ...song,
        isFavorite: favoriteIds.has(song.id),
        variants: song.variants || []
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Supabase getSongs error:", error);
      return { data: [], error };
    }
  }

  async getTopSongs(limit = 10) {
    try {
      const { data, error } = await this.client
        .from('songs')
        .select(`
          *,
          variants:song_variants(*)
        `)
        .order('search_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: (data || []).filter(s => s.search_count > 0), error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  async uploadPDF(file: File): Promise<{ url: string | null; error: any }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await this.client.storage
        .from('music-sheets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = this.client.storage
        .from('music-sheets')
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error) {
      return { url: null, error };
    }
  }

  async addSong(newSong: Omit<Song, 'id' | 'search_count' | 'created_at'>) {
    const { data: songData, error: songError } = await this.client
      .from('songs')
      .insert({
        name: newSong.name,
        categories: newSong.categories,
        instrument: newSong.instrument
      })
      .select()
      .single();

    if (songError) return { data: null, error: songError };

    if (newSong.variants && newSong.variants.length > 0) {
      const variantsWithId = newSong.variants.map(v => ({
        song_id: songData.id,
        key: v.key,
        pdf_url: v.pdf_url
      }));
      await this.client.from('song_variants').insert(variantsWithId);
    }

    return { data: songData, error: null };
  }

  async addKeyToSong(id: string, variant: SongVariant) {
    const { error } = await this.client
      .from('song_variants')
      .upsert({
        song_id: id,
        key: variant.key,
        pdf_url: variant.pdf_url
      }, { onConflict: 'song_id,key' });

    return { success: !error, error };
  }

  async toggleFavorite(songId: string) {
    const { data: authData } = await this.client.auth.getUser();
    const currentUser = authData?.user;
    if (!currentUser) return { success: false };

    const { data: existing } = await this.client
      .from('user_favorites')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('song_id', songId)
      .maybeSingle();

    if (existing) {
      await this.client.from('user_favorites').delete().eq('id', existing.id);
    } else {
      await this.client.from('user_favorites').insert({ user_id: currentUser.id, song_id: songId });
    }
    return { success: true };
  }

  async deleteSong(id: string) {
    const { error } = await this.client.from('songs').delete().eq('id', id);
    return { success: !error, error };
  }

  async incrementSearch(id: string) {
    try {
      await this.client.rpc('increment_search_count', { song_id: id });
    } catch (e) {
      const { data } = await this.client.from('songs').select('search_count').eq('id', id).single();
      if (data) {
        await this.client.from('songs').update({ search_count: (data.search_count || 0) + 1 }).eq('id', id);
      }
    }
  }

  async addAdmin(email: string) {
    const { error } = await this.client.from('admins').insert({ email });
    return { success: !error, error };
  }

  async getAdmins() {
    try {
      const { data, error } = await this.client.from('admins').select('*');
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  async removeAdmin(email: string) {
    const { error } = await this.client.from('admins').delete().eq('email', email);
    return { success: !error, error };
  }

  async setSessionUser(session: any) {
    if (!session?.user) {
      this.user = null;
      return null;
    }

    let isAdmin = false;
    const adminEmails = ['admin@lege.music', 'khiemvinhtran1112@gmail.com'];
    
    try {
      const { data: adminData } = await this.client
        .from('admins')
        .select('id')
        .eq('email', session.user.email)
        .maybeSingle();
      isAdmin = !!adminData || adminEmails.includes(session.user.email);
    } catch (e) {
      isAdmin = adminEmails.includes(session.user.email);
    }

    this.user = {
      id: session.user.id,
      email: session.user.email,
      isAdmin: isAdmin
    };

    return this.user;
  }
}

export const supabase = new SupabaseService();
