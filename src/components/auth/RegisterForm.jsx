import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import supabase from "../../lib/supabaseClient";
import Button from "../ui/Button";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    country: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptNews: false,
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!formData.acceptTerms) {
      toast.error(
        "Vous devez accepter les CGU et la politique de confidentialité"
      );
      return;
    }

    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;

      // Création dans auth.users
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            birth_date: formData.birthDate,
            country: formData.country,
            phone: formData.phone,
            accept_news: formData.acceptNews,
          },
        },
      });

      if (error) throw error;

      // ✅ Insertion dans ta table "users"
      if (data?.user) {
        const { error: userError } = await supabase.from("users").insert([
          {
            id: data.user.id, // correspond à auth.users.id
            email: formData.email,
            full_name: fullName,
            birth_date: formData.birthDate,
            country: formData.country,
            phone: formData.phone,
            accept_news: formData.acceptNews,
          },
        ]);

        if (userError) {
          console.error(
            "Erreur lors de la création de l'utilisateur dans users:",
            userError.message
          );
        }
      }

      toast.success("Inscription réussie ! Vérifiez vos emails pour confirmer.");
      navigate("/check-email", { state: { email: formData.email } });
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Prénom
          </label>
          <input
            type="text"
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nom</label>
          <input
            type="text"
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Date de naissance
        </label>
        <input
          type="date"
          name="birthDate"
          value={formData.birthDate}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Pays</label>
        <input
          type="text"
          name="country"
          value={formData.country}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Téléphone
        </label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Adresse e-mail
        </label>
        <input
          type="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          type="password"
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Confirmer le mot de passe
        </label>
        <input
          type="password"
          name="confirmPassword"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm sm:text-sm"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="acceptNews"
          checked={formData.acceptNews}
          onChange={handleChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Recevoir les actualités et offres
        </label>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleChange}
          required
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          J’accepte les CGU et la politique de confidentialité
        </label>
      </div>

      <div>
        <Button type="submit" loading={loading} className="w-full">
          S'inscrire
        </Button>
      </div>
    </form>
  );
};

export default RegisterForm;
