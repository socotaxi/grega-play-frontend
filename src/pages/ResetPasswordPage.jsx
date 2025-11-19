import React, { useState } from "react";
import supabase from "../lib/supabaseClient";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
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
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-10">
          {/* Bloc texte à gauche */}
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Choisis un nouveau mot de passe
            </h1>
            <p className="text-base text-gray-600 mb-4">
              Tu as demandé à réinitialiser ton mot de passe Grega Play.
              Saisis un nouveau mot de passe sécurisé pour protéger tes
              événements et tes vidéos.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Utilise un mot de passe unique que tu n’emploies pas ailleurs.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Mélange lettres, chiffres et caractères spéciaux si possible.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Ne partage jamais ton mot de passe, même avec un proche.</span>
              </li>
            </ul>
          </div>

          {/* Carte formulaire à droite */}
          <div className="md:w-1/2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-7">
              <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center md:text-left">
                Nouveau mot de passe
              </h2>
              <p className="text-xs text-gray-500 mb-5 text-center md:text-left">
                Ce lien est généralement valable quelques minutes. Une fois le
                mot de passe changé, tu seras invité à te reconnecter.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Minimum 6 caractères (recommandé : 10+).
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    loading={loading}
                    className="w-full py-2.5 text-sm font-semibold"
                  >
                    {loading ? "Mise à jour..." : "Changer mon mot de passe"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ResetPasswordPage;
