
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song, AuthUser, SongVariant, UserProfile } from '../types';

const SUPABASE_URL = 'https://fmnavpehjraucuhzmbol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbmF2cGVoanJhdWN1aHptYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0Mjc5NzYsImV4cCI6MjA4NDAwMzk3Nn0.nlNXUZfP_rxk2qAN8Js_eHwqdEVTfiACDPkppq8_rNs';

class SupabaseService {
  public client: SupabaseClient;
  private user: AuthUser | null = null;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async signUpWithEmail(email: string, password: string, username: string) {
    return await this.client.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username }
      }
    });
  }

  async signInWithEmail(email: string, password: string) {
    return await this.client.auth.signInWithPassword({ email, password });
  }

  async logout() {
    this.user = null;
    try {
      await this.client.auth.signOut();
    } catch (e) {
      console.warn("Supabase signOut error:", e);
    }
  }

  private async ensureProfileExists(userId: string, email?: string, username?: string) {
    if (!userId) return;
    try {
      const { data: profile } = await this.client.from('profiles').select('username').eq('id', userId).maybeSingle();
      if (!profile) {
        await this.client.from('profiles').upsert({ 
          id: userId, 
          email: email, 
          username: username || email?.split('@')[0] || 'User' 
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn("Profile sync failed:", e);
    }
  }

  async getSongs() {
    try {
      const { data: authData } = await this.client.auth.getUser();
      const currentUser = authData?.user;
      const { data: songsData, error: songsError } = await this.client
        .from('songs')
        .select(`*, variants:song_variants(*)`)
        .order('created_at', { ascending: false });

      if (songsError) throw songsError;

      let favoriteIds = new Set<string>();
      if (currentUser) {
        const { data: favsData } = await this.client
          .from('user_favorites')
          .select('song_id')
          .eq('user_id', currentUser.id);
        if (favsData) favoriteIds = new Set(favsData.map(f => f.song_id));
      }

      const transformedData: Song[] = (songsData || []).map((song: any) => ({
        ...song,
        isFavorite: favoriteIds.has(song.id),
        variants: song.variants || []
      }));
      return { data: transformedData, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  async getSongById(id: string) {
    try {
      const { data: authData } = await this.client.auth.getUser();
      const currentUser = authData?.user;
      const { data: song, error } = await this.client
        .from('songs')
        .select(`*, variants:song_variants(*)`)
        .eq('id', id)
        .single();

      if (error) throw error;

      let isFavorite = false;
      if (currentUser) {
        const { data: fav } = await this.client
          .from('user_favorites')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('song_id', id)
          .maybeSingle();
        isFavorite = !!fav;
      }

      return { 
        data: { ...song, isFavorite, variants: song.variants || [] } as Song, 
        error: null 
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  async toggleFavorite(songId: string) {
    try {
      const { data: authData } = await this.client.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) return { success: false, error: 'Not authenticated' };

      const { data: existing } = await this.client
        .from('user_favorites')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('song_id', songId)
        .maybeSingle();

      if (existing) {
        await this.client.from('user_favorites').delete().eq('id', existing.id);
        return { success: true };
      } else {
        await this.client.from('user_favorites').insert({ user_id: currentUser.id, song_id: songId });
        return { success: true };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  async uploadPDF(file: File): Promise<{ url: string | null; error: any }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data, error: uploadError } = await this.client.storage
        .from('music-sheets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = this.client.storage.from('music-sheets').getPublicUrl(fileName);
      return { url: publicUrl, error: null };
    } catch (error) {
      return { url: null, error };
    }
  }

  async addSong(newSong: Omit<Song, 'id' | 'created_at'>) {
    const { data: songData, error: songError } = await this.client
      .from('songs')
      .insert({ name: newSong.name, categories: newSong.categories, instrument: newSong.instrument })
      .select().single();

    if (songError) return { data: null, error: songError };

    if (newSong.variants?.length) {
      const variantsWithId = newSong.variants.map(v => ({ song_id: songData.id, key: v.key, pdf_url: v.pdf_url }));
      const { error: varError } = await this.client.from('song_variants').insert(variantsWithId);
      if (varError) {
        await this.client.from('songs').delete().eq('id', songData.id);
        return { data: null, error: varError };
      }
    }
    return { data: songData, error: null };
  }

  async addKeyToSong(id: string, variant: SongVariant) {
    const { error } = await this.client.from('song_variants').upsert({
      song_id: id, key: variant.key, pdf_url: variant.pdf_url
    }, { onConflict: 'song_id,key' });
    return { success: !error, error };
  }

  async deleteSong(id: string) {
    try {
      const { data: variants } = await this.client.from('song_variants').select('pdf_url').eq('song_id', id);
      if (variants?.length) {
        const filePaths = variants.map(v => v.pdf_url.split('/').pop()!).filter(Boolean);
        await this.client.storage.from('music-sheets').remove(filePaths);
      }
      await this.client.from('user_favorites').delete().eq('song_id', id);
      await this.client.from('song_variants').delete().eq('song_id', id);
      const { error, count } = await this.client.from('songs').delete({ count: 'exact' }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: count !== 0, error: count === 0 ? "Permission Denied" : null };
    } catch (error: any) {
      return { success: false, error: error?.message || "Internal error" };
    }
  }

  async grantAdminAccess(email: string) {
    const { data: profile } = await this.client
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      return { 
        success: false, 
        error: { message: `Account "${email}" not found. The user must sign up for LeGe's before you can grant them admin access.` } 
      };
    }

    const { error } = await this.client.from('admins').insert({ email });
    return { success: !error, error };
  }

  async getPrivilegedUsers() {
    const { data, error } = await this.client.from('admins').select('*');
    return { data: (data || []).map((u: any) => ({ id: u.id, email: u.email })), error };
  }
  
  async getProfiles() {
    const { data, error } = await this.client.from('profiles').select('*').order('email');
    return { data: data as UserProfile[], error };
  }

  async revokeAdminAccess(email: string) {
    if (email === 'khiemvinhtran1112@gmail.com') return { success: false, error: { message: "Root admin cannot be removed." }};
    const { error } = await this.client.from('admins').delete().eq('email', email);
    return { success: !error, error };
  }

  async setSessionUser(session: any) {
    if (!session?.user) {
      this.user = null;
      return null;
    }

    const userId = session.user.id;
    const email = session.user.email;
    const username = session.user.user_metadata?.username;

    await this.ensureProfileExists(userId, email, username);

    const { data: profile } = await this.client
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    let isAdmin = false;
    const rootAdmin = 'khiemvinhtran1112@gmail.com';
    
    try {
      const { data: adminData } = await this.client.from('admins').select('id').eq('email', email).maybeSingle();
      isAdmin = !!adminData || email === rootAdmin;
    } catch (e) {
      isAdmin = email === rootAdmin;
    }
    
    this.user = { 
      id: userId, 
      email: email, 
      username: profile?.username || username || email.split('@')[0],
      isAdmin 
    };
    return this.user;
  }
}

export const supabase = new SupabaseService();
