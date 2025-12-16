// src/pages/CheckoutPremiumPage.jsx
import React, { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001";
const API_KEY = import.meta.env.VITE_API_SECRET || "";

const CheckoutPremiumPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgradeToPremium = async () => {
    if (!user) {
      toast.error("Connecte-toi pour passer au plan Premium.");
      return;
    }

    if (!API_KEY) {
      toast.error(
        "Configuration manquante côté frontend (VITE_API_SECRET)."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/billing/checkout-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        }
      );

      if (!response.ok) {
        // On essaie de lire le body pour avoir un message plus précis
        let errorMessage = "Réponse serveur invalide";
        try {
          const errData = await response.json();
          if (errData?.error) {
            errorMessage = errData.error;
          }
        } catch {
          // ignore parse error
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Cas 1 : mode Stripe activé (plus tard) → redirection vers Checkout
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Cas 2 : mode “Premium gratuit” → activation directe côté backend
      if (data.success) {
        const message =
          data.message ||
          "Ton compte est maintenant Premium, offre de lancement gratuite.";
        toast.success(message);

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);

        return;
      }

      // Cas où l’API répond mais sans succès clair
      toast.error(
        data.error ||
          "Impossible d'activer le Premium pour l'instant. Réessaie plus tard."
      );
    } catch (error) {
      console.error("Erreur upgrade premium:", error);
      toast.error(
        error.message ||
          "Une erreur est survenue lors de l'activation du Premium. Réessaie plus tard."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm px-6 py-8 sm:px-8 sm:py-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Activer Grega Play Premium
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Tu es sur le point de passer au plan Grega Play Premium pour
              débloquer plus de vidéos, plus de durée, plus de transitions et
              une meilleure priorité de traitement.
            </p>

            <div className="mt-5 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">
                Récapitulatif des avantages :
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>Compte Grega Play en mode Premium</li>
                <li>Plus de vidéos par événement</li>
                <li>Transitions et musique améliorées</li>
                <li>Priorité sur la génération de la vidéo finale</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                Pendant la phase de lancement, l’activation du mode Premium est
                offerte. Plus tard, cette page pourra rediriger vers un paiement
                sécurisé (Stripe) quand le système de paiement sera activé.
              </p>
            </div>

            <div className="mt-6 flex flex-col items-start gap-3">
              <Button
                onClick={handleUpgradeToPremium}
                loading={loading}
                className="inline-flex items-center px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-full shadow-sm"
              >
                Activer mon compte Premium gratuit
              </Button>
              <p className="text-[11px] text-gray-500">
                Aujourd’hui, l’activation Premium est gratuite dans le cadre du
                lancement de Grega Play. Plus tard, ce bouton pourra ouvrir une
                page de paiement Stripe sans que tu aies à changer cette page.
              </p>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export default CheckoutPremiumPage;
