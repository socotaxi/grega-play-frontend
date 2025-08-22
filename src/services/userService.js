import supabase from "../lib/supabaseClient";

const userService = {
  // Récupère un utilisateur par ID
  async getUser(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Met à jour un utilisateur
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Upload avatar et met à jour la colonne avatar_url
  async uploadAvatar(userId, file) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload du fichier
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Génère l’URL publique
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Mise à jour du profil utilisateur
    const { data, error } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default userService;
