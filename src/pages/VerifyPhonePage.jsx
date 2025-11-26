// src/pages/VerifyPhonePage.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import MainLayout from "../components/layout/MainLayout";
import supabase from "../lib/supabaseClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const VerifyPhonePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const phone = location.state?.phone || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!phone) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-md w-full text-center">
            <p className="mb-4 text-gray-700">
              Aucune demande de connexion par téléphone détectée.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="bg-indigo-600 text-white px-4 py-2 rounded"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Entre le code reçu sur WhatsApp.");
      return;
    }

    setLoading(true);
    try {
      // 1) Vérifier OTP et récupérer pseudoEmail + password
      const res = await fetch(`${BACKEND_URL}/auth/verify-otp-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Code invalide ou expiré.");
        return;
      }

      const { pseudoEmail, password } = data;

      if (!pseudoEmail || !password) {
        toast.error(
          "Réponse serveur incomplète (pseudoEmail ou password manquant)."
        );
        return;
      }

      // 2) Créer la session Supabase (vrai user, pseudo-email)
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password,
      });

      if (loginError) {
        console.error("Erreur login Supabase après OTP:", loginError);
        toast.error("Impossible de créer la session.");
        return;
      }

      toast.success("Connexion réussie !");
      navigate("/dashboard");
    } catch (err) {
      console.error("Erreur verify-otp / login:", err);
      toast.error("Erreur lors de la vérification du code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
          <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Vérifie ton numéro
          </h1>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Nous avons envoyé un code WhatsApp au numéro :
            <br />
            <span className="font-medium">{phone}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code reçu sur WhatsApp
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="w-full border border-gray-300 px-3 py-2 rounded-md"
                placeholder="Ex : 123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Vérification..." : "Valider le code"}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Si tu n’as rien reçu, vérifie que ton numéro est correct et que
            WhatsApp est bien actif.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default VerifyPhonePage;
