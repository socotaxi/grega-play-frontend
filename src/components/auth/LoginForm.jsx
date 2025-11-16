import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../../lib/supabaseClient';
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";




const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5 3.5-8.7z"/>
    <path fill="#34A853" d="M12 24c3.2 0 5.9-1 7.8-2.7l-3.9-3c-1.1.8-2.6 1.3-3.9 1.3-3 0-5.6-2-6.5-4.7H1.5v3c2 4 6 6.1 10.5 6.1z"/>
    <path fill="#FBBC05" d="M5.5 14.9c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.7H1.5A11.9 11.9 0 0 0 0 12.8c0 1.9.5 3.8 1.5 5.3l4-3.2z"/>
    <path fill="#EA4335" d="M12 4.7c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 12 0C7.5 0 3.5 2.1 1.5 5.5l4 3.2c.9-2.7 3.5-4.6 6.5-4.6z"/>
  </svg>
);

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

const { loginWithGoogle } = useAuth();

const handleGoogleLogin = async () => {
  try {
    await loginWithGoogle();
    toast.info("Redirection vers Google...");
  } catch (err) {
    toast.error("Connexion Google impossible, réessayez.");
  }
};

const { loginWithFacebook } = useAuth();

const handleFacebookLogin = async () => {
  try {
    await loginWithFacebook();
    toast.info("Redirection vers Facebook…");
  } catch (err) {
    toast.error("Connexion Facebook impossible.");
  }
};


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        return;
      }

      toast.success('✅ Connexion réussie');
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-0 p-6 bg-white rounded shadow">
      
<button  type="button"  onClick={handleFacebookLogin}  className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
>
  <FaFacebook className="text-lg" />
  Continuer avec Facebook
</button>

  <div className="text-center text-gray-500">ou</div>

<button type="button" onClick={handleGoogleLogin} className="w-full border border-gray-300 text-gray-700 p-2 rounded hover:bg-gray-50 flex items-center justify-center gap-2">
  <GoogleIcon />
   Continuer avec Google
</button>

      <div className="text-center text-gray-500">ou</div>
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
          className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
        >
          Se connecter
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
