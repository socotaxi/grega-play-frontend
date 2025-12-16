import React from "react";
import { Link } from "react-router-dom";

const ConfidentialitePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Politique de confidentialité
          </h1>
          <Link
            to="/register"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 underline"
          >
            Retour
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
          <p className="text-sm text-gray-500">
            Dernière mise à jour : <span className="font-medium">Décembre 2025</span>
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">1. Objet</h2>
            <p className="text-gray-700">
              Cette politique explique comment Grega Play collecte, utilise et protège les données
              personnelles nécessaires au fonctionnement du service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">2. Responsable du traitement</h2>
            <p className="text-gray-700">
              Grega Play — Contact : <span className="font-medium">contact@gregaplay.com</span> (à adapter).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">3. Données collectées</h2>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Données de compte : email, nom/prénom (ou pseudo), photo de profil (facultatif).</li>
              <li>Données événement : titre, description, participants/invitations, historique lié à l’événement.</li>
              <li>Contenus : vidéos envoyées, textes associés.</li>
              <li>Données techniques : logs, informations de session, erreurs, appareil/navigateur (minimum nécessaire).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">4. Finalités</h2>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Créer et gérer les comptes utilisateurs.</li>
              <li>Créer, gérer et sécuriser les événements.</li>
              <li>Héberger et traiter les vidéos (montage/génération de la vidéo finale).</li>
              <li>Envoyer des notifications liées au service (ex. vidéo reçue, vidéo finale prête).</li>
              <li>Améliorer la qualité et la sécurité (diagnostic, prévention des abus).</li>
              <li>Gérer le Premium et la facturation si applicable.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">5. Partage des données</h2>
            <p className="text-gray-700">
              Les données ne sont pas vendues. Elles peuvent être partagées uniquement :
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>avec des prestataires techniques (hébergement, email, stockage, traitement vidéo),</li>
              <li>avec un prestataire de paiement (uniquement pour la gestion du Premium),</li>
              <li>avec les personnes autorisées au sein du même événement (cadre privé).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">6. Durée de conservation</h2>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>Données de compte : tant que le compte est actif.</li>
              <li>Vidéos : pendant la durée de vie de l’événement + une période raisonnable (à définir).</li>
              <li>Logs techniques : durée limitée pour sécurité et amélioration.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">7. Sécurité</h2>
            <p className="text-gray-700">
              Grega Play applique des mesures de sécurité raisonnables : contrôle d’accès, permissions
              par événement, protection contre les accès non autorisés. Aucun système n’étant parfait,
              un risque résiduel peut exister.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">8. Droits des utilisateurs</h2>
            <p className="text-gray-700">
              Selon la réglementation applicable, l’utilisateur peut demander : accès, rectification,
              suppression, limitation, opposition et portabilité (si applicable).
            </p>
            <p className="text-gray-700">
              Contact : <span className="font-medium">contact@gregaplay.com</span>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">9. Cookies</h2>
            <p className="text-gray-700">
              Grega Play peut utiliser des cookies/stockages similaires pour maintenir la session et
              améliorer l’expérience. L’utilisateur peut les limiter via son navigateur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">10. Modifications</h2>
            <p className="text-gray-700">
              Cette politique peut évoluer. Les changements importants seront signalés dans l’application.
            </p>
          </section>

          <div className="pt-2">
            <Link
              to="/cgu"
              className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              Lire aussi les CGU
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfidentialitePage;
