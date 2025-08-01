import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userService = {
  async uploadAvatar(file, userId) {
    if (!file || !userId) throw new Error("Paramètres manquants pour l'avatar");

    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}.${fileExt}`;
    const filePath = fileName;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData?.publicUrl;
  }
};

export default userService;
