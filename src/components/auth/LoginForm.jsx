import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { FcGoogle } from "react-icons/fc";

// ✅ Fallback local si la variable d'env n'est pas définie
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:3001";

const LoginForm = () => {
  const navigate = useNavigate();

  // Champ unique: email OU téléphone
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const { loginWithGoogle } = useAuth();

  /* -----------------------------
     GOOGLE LOGIN
  ----------------------------- */
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.info("Redirection vers Google...");
    } catch {
      toast.error("Connexion Google impossible");
    }
  };

  /* -----------------------------
     HELPERS EMAIL / PHONE
  ----------------------------- */
  const isEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const isPhone = (value) =>
    /^(\+?\d{8,15})$/.test(value.replace(/\s+/g, "")); // numéro international, ex: +242...

  /* -----------------------------
     ENVOI OTP WHATSAPP VIA BACKEND
  ----------------------------- */
  const sendWhatsAppOtp = async (phoneNumber) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/auth/request-otp-whatsapp`, // ✅ /auth, pas /api/auth
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneNumber }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur envoi WhatsApp");
      }

      toast.success("Code envoyé sur WhatsApp !");
      navigate("/verify-phone", { state: { phone: phoneNumber } });
    } catch (err) {
      console.error("Erreur WhatsApp OTP:", err);
      toast.error("Impossible d'envoyer le code sur WhatsApp.");
    }
  };

  /* -----------------------------
     SUBMIT
  ----------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanId = identifier.trim();

    // CAS 1 : email → login Supabase classique
    if (isEmail(cleanId)) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password,
      });

      if (error) {
        toast.error("Email ou mot de passe incorrect.");
        return;
      }

      const user = data?.user;
      if (!user?.confirmed_at) {
        toast.error("Valide d'abord ton adresse email.");
        return;
      }

      toast.success("Connexion réussie");
      navigate("/dashboard");
      return;
    }

    // CAS 2 : téléphone → envoyer OTP via WhatsApp
    if (isPhone(cleanId)) {
      const phoneNumber = cleanId.startsWith("+")
        ? cleanId
        : "+242" + cleanId; // tu peux adapter si tu veux forcer un autre préfixe

      await sendWhatsAppOtp(phoneNumber);
      return;
    }

    // Sinon -> format invalide
    toast.error("Entre un email valide ou un numéro de téléphone valide.");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">

      {/* GOOGLE LOGIN */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full border border-gray-300 text-gray-700 p-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <FcGoogle className="text-lg" />
        Continuer avec Google
      </button>

      <div className="text-center text-gray-500 my-3">ou</div>

      <h2 className="text-2xl font-semibold mb-4 text-center">
        Connexion
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifiant unique */}
        <input
          type="text"
          name="identifier"
          placeholder="Email ou numéro de téléphone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded"
        />

        {/* Mot de passe affiché uniquement si on est clairement sur un email */}
        {isEmail(identifier) && (
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
          />
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
        >
          {isPhone(identifier)
            ? "Recevoir mon code sur WhatsApp"
            : "Se connecter"}
        </button>

        <p className="mt-2 text-sm text-right">
          <a href="/forgot-password" className="text-indigo-600 hover:text-indigo-800">
            Mot de passe oublié ?
          </a>
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
