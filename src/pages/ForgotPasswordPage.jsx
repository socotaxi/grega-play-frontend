import React, { useState } from "react";
import supabase from "../lib/supabaseClient";
import MainLayout from '../components/layout/MainLayout';
import { toast } from "react-toastify";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Un email de réinitialisation a été envoyé !");
    }
    setLoading(false);
  };

  return (
    <MainLayout>
    <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Mot de passe oublié</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded-md"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
        >
          {loading ? "Envoi..." : "Réinitialiser mon mot de passe"}
        </button>
      </form>
    </div>
    </MainLayout>
  );
};

export default ForgotPasswordPage;
