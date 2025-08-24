import React, { useState } from "react";
import supabase from "../lib/supabaseClient";
import MainLayout from '../components/layout/MainLayout';
import { toast } from "react-toastify";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe mis à jour !");
      window.location.href = "/login";
    }
    setLoading(false);
  };

  return (
    <MainLayout>
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Nouveau mot de passe</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded-md"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
        >
          {loading ? "Mise à jour..." : "Changer mon mot de passe"}
        </button>
      </form>
    </div>
    </MainLayout>
  );
};

export default ResetPasswordPage;
