import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Song, AuthUser, SongVariant, UserProfile } from '../types';

const SUPABASE_URL = 'https://fmnavpehjraucuhzmbol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbmF2cGVoanJhdWN1aHptYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0Mjc5NzYsImV4cCI6MjA4NDAwMzk3Nn0.nlNXUZfP_rxk2qAN8Js_eHwqdEVTfiACDPkppq8_rNs';

class SupabaseService {
  public client: SupabaseClient;
  private currentUser: AuthUser | null = null;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  private extractFileName(url: string): string | null {
    if (!url) return null;
    try {
      // Decode the URL first to handle space encodings (%20) etc.
      const decodedUrl = decodeURIComponent(url);
      const bucketName = 'music-sheets';
      
      // Robust Regex to find the path after /music-sheets/
      // Matches: .../music-sheets/filename.pdf AND .../music-sheets/folder/filename.pdf
      const regex = new RegExp(`/${bucketName}/(.+)$`);
      const match = decodedUrl.match(regex);

      if (match && match[1]) {
        // Return the captured group, stripping any query parameters (like ?t=...)
        return match[1].split('?')[0];
      }
      
      // Fallback: simple split if regex fails, though regex is preferred for Supabase URLs
      const lastSegment = decodedUrl.split('/').pop();
      if (lastSegment) {
        return lastSegment.split('?')[0];
      }
      return null;
    } catch (e) {
      console.error("Failed to extract filename from URL:", url, e);
      return null;
    }
  }

  async signUpWithEmail(email: string, password: string, username: string) {
    return await this.client.auth.signUp({ 
      email, 
      password,
      options: { data: { username } }
    });
  }

  async signInWithEmail(email: string, password: string) {
    return await this.client.auth.signInWithPassword({ email, password });
  }

  async logout() {
    this.currentUser = null;
    try {
      await this.client.auth.signOut();
    } catch (e) {}
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
    } catch (e) {}
  }

  async getSongs() {
    try {
      const { data: songsData, error: songsError } = await this.client
        .from('songs')
        .select(`*, variants:song_variants(*)`)
        .order('created_at', { ascending: false });

      if (songsError) throw songsError;

      const currentUserId = this.currentUser?.id;
      let favoriteIds = new Set<string>();

      if (currentUserId) {
        try {
          const { data: favsData } = await this.client
            .from('user_favorites')
            .select('song_id')
            .eq('user_id', currentUserId);
          if (favsData) favoriteIds = new Set(favsData.map(f => f.song_id));
        } catch (e) {}
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
      const { data: song, error } = await this.client
        .from('songs')
        .select(`*, variants:song_variants(*)`)
        .eq('id', id)
        .single();

      if (error) throw error;

      let isFavorite = false;
      const currentUserId = this.currentUser?.id;
      if (currentUserId) {
        try {
          const { data: fav } = await this.client
            .from('user_favorites')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('song_id', id)
            .maybeSingle();
          isFavorite = !!fav;
        } catch (e) {}
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
      const currentUserId = this.currentUser?.id;
      if (!currentUserId) return { success: false, error: 'Not authenticated' };

      const { data: existing } = await this.client
        .from('user_favorites')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('song_id', songId)
        .maybeSingle();

      if (existing) {
        await this.client.from('user_favorites').delete().eq('id', existing.id);
        return { success: true };
      } else {
        await this.client.from('user_favorites').insert({ user_id: currentUserId, song_id: songId });
        return { success: true };
      }
    } catch (error) {
      return { success: false, error };
    }
  }

  async uploadPDF(file: File): Promise<{ url: string | null; error: any }> {
    try {
      // Sanitize filename to avoid encoding issues
      const fileExt = file.name.split('.').pop();
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '-');
      const fileName = `${Date.now()}-${cleanName}.${fileExt}`;
      
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

  async deleteFile(url: string) {
    const fileName = this.extractFileName(url);
    if (fileName) {
      return await this.client.storage.from('music-sheets').remove([fileName]);
    }
    return { data: null, error: new Error("Invalid file URL") };
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
    try {
      // Check for existing variant to clean up old file if replacing
      const { data: existing } = await this.client
        .from('song_variants')
        .select('pdf_url')
        .eq('song_id', id)
        .eq('key', variant.key)
        .maybeSingle();

      if (existing && existing.pdf_url && existing.pdf_url !== variant.pdf_url) {
        const oldFileName = this.extractFileName(existing.pdf_url);
        if (oldFileName) {
          console.log("Replacing variant, deleting old file:", oldFileName);
          await this.client.storage.from('music-sheets').remove([oldFileName]);
        }
      }
    } catch (e) {
      console.warn("Error cleaning up old variant file:", e);
    }

    const { error } = await this.client.from('song_variants').upsert({
      song_id: id, key: variant.key, pdf_url: variant.pdf_url
    }, { onConflict: 'song_id,key' });
    
    return { success: !error, error };
  }

  async deleteSong(id: string) {
    let storageError = null;
    try {
      console.log("Starting deletion for song:", id);
      
      // 1. Fetch ALL variants first to identify files to delete
      const { data: variants, error: fetchError } = await this.client
        .from('song_variants')
        .select('pdf_url')
        .eq('song_id', id);

      if (fetchError) console.error("Error fetching variants for delete:", fetchError);

      // 2. Storage Cleanup
      if (variants && variants.length > 0) {
        const fileNames = variants
          .map(v => this.extractFileName(v.pdf_url))
          .filter((n): n is string => n !== null);
        
        console.log("Files identified for deletion:", fileNames);

        if (fileNames.length > 0) {
          const { data: removeData, error: removeError } = await this.client.storage
            .from('music-sheets')
            .remove(fileNames);
            
          if (removeError) {
             console.error("Storage cleanup failed:", removeError);
             storageError = removeError;
          } else {
             console.log("Storage cleanup success:", removeData);
          }
        }
      }

      // 3. Database Cleanup
      // Note: We use { count: 'exact' } to verify if rows were actually deleted.
      // If RLS denies access, count will be 0 even if no error is returned.

      // A. Favorites (Optional cleanup, good practice)
      await this.client.from('user_favorites').delete().eq('song_id', id);
      
      // B. Variants
      await this.client.from('song_variants').delete().eq('song_id', id);
      
      // C. The Song (Critical)
      const { error, count } = await this.client
        .from('songs')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      // Check if anything was actually deleted
      if (count === 0) {
        throw new Error("Deletion failed. You may not have permission, or the song was not found.");
      }
      
      return { success: true, error: null, storageError };
    } catch (error: any) {
      console.error("Delete Song Error:", error);
      return { success: false, error: error.message || "Failed to delete song.", storageError };
    }
  }

  async grantAdminAccess(email: string) {
    const { data: profile } = await this.client.from('profiles').select('email').eq('email', email).maybeSingle();
    if (!profile) return { success: false, error: { message: `Account "${email}" not found.` } };
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

  async setSessionUser(session: any): Promise<AuthUser | null> {
    if (!session?.user) {
      this.currentUser = null;
      return null;
    }

    const userId = session.user.id;
    const email = session.user.email;
    const username = session.user.user_metadata?.username || email.split('@')[0];

    this.ensureProfileExists(userId, email, username);

    const rootAdmin = 'khiemvinhtran1112@gmail.com';
    const isAdminInitial = email === rootAdmin;
    
    const user: AuthUser = { id: userId, email, username, isAdmin: isAdminInitial };
    this.currentUser = user;

    (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          this.client.from('profiles').select('username').eq('id', userId).maybeSingle(),
          this.client.from('admins').select('id').eq('email', email).maybeSingle()
        ]);
        if (pRes.data?.username) user.username = pRes.data.username;
        if (aRes.data) user.isAdmin = true;
      } catch (e) {}
    })();

    return user;
  }
}

export const supabase = new SupabaseService();