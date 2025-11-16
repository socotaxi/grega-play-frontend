import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import { toast } from "react-toastify";

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { email, password } = formData;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('❌ Email ou mot de passe incorrect');
    } else {
      const user = data?.user;

      if (!user?.confirmed_at) {
        toast.error('⚠️ Veuillez d’abord valider votre adresse email.');
        setIsSubmitting(false);
        return;
      }

      toast.success('✅ Connexion réussie');
      navigate('/dashboard');
    }

    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      toast.info('Redirection vers Google…');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error("Impossible d'ouvrir la fenêtre de connexion Google");
      }
    } catch (err) {
      console.error('Erreur OAuth Google:', err);
      toast.error('Une erreur est survenue avec Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-6 text-center">Connexion</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Adresse email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2 rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          value={formData.password}
          onChange={handleChange}
          className="w-full border border-gray-300 p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="mt-2 text-sm text-right">
  <a href="/forgot-password" className="text-indigo-600 hover:text-indigo-800">
    Mot de passe oublié ?
  </a>
</p>
        <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
          <span className="flex-1 border-t" />
          ou
          <span className="flex-1 border-t" />
        </div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full border border-gray-300 text-gray-700 p-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span role="img" aria-hidden="true">🔐</span>
          {isGoogleLoading ? 'Connexion à Google…' : 'Continuer avec Google'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
