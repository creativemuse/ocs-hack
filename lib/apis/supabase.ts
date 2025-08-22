import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AudioFile = {
  name: string;
  path: string;
  artistName: string;
  songTitle: string;
};

const getServerClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
};

const parseArtistAndTitle = (filename: string): { artistName: string; songTitle: string } => {
  const base = filename.replace(/\.[^/.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artistName: parts[0]!.trim(), songTitle: parts.slice(1).join(' - ').trim() };
  }
  // Fallback: try "Artist_Title"
  const under = base.split('_');
  if (under.length >= 2) {
    return { artistName: under[0]!.trim(), songTitle: under.slice(1).join(' ').trim() };
  }
  return { artistName: 'Unknown', songTitle: base.trim() || 'Unknown' };
};

export const SupabaseStorage = {
  async listAudioFiles(bucket: string, prefix = ''): Promise<AudioFile[]> {
    const s = getServerClient();
    const { data, error } = await s.storage.from(bucket).list(prefix, { 
      limit: 1000, 
      sortBy: { column: 'name', order: 'asc' } 
    });
    if (error) throw error;

    const allowed = ['.mp3', '.wav', '.m4a', '.ogg'];
    return (data || [])
      .filter((o) => allowed.some((ext) => o.name.toLowerCase().endsWith(ext)))
      .map((o) => {
        const { artistName, songTitle } = parseArtistAndTitle(o.name);
        return { 
          name: o.name, 
          path: prefix ? `${prefix}/${o.name}` : o.name, 
          artistName, 
          songTitle 
        };
      });
  },

  async createSignedUrl(bucket: string, path: string, expiresInSeconds = 300): Promise<string> {
    const s = getServerClient();
    const { data, error } = await s.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },
};
