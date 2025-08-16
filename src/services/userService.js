// src/services/userService.js
import supabase from '../lib/supabaseClient';

const userService = {
  async uploadAvatar(file, userId) {
    if (!file || !userId) {
      throw new Error("Paramètres manquants pour l'avatar");
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}.${fileExt}`;
    const filePath = fileName;

    // ✅ Upload avatar
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error("Erreur upload avatar:", error);
      throw error;
    }

    // ✅ Récupérer l’URL publique
    const { data: urlData } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  }
};

export default userService;
