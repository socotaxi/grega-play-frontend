import React from "react";
import { Link } from "react-router-dom";

const CguPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Conditions Générales d’Utilisation (CGU)
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
            <h2 className="text-lg font-semibold text-gray-900">1. Présentation du service</h2>
            <p className="text-gray-700">
              Grega Play est une plateforme permettant à plusieurs utilisateurs de contribuer
              à une vidéo collaborative à l’occasion d’un événement (anniversaire, mariage,
              départ, challenge, etc.).
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li>création d’un événement par un organisateur,</li>
              <li>invitation de participants,</li>
              <li>envoi de courtes vidéos,</li>
              <li>génération automatique d’une vidéo finale.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">2. Acceptation des CGU</h2>
            <p className="text-gray-700">
              L’inscription et l’utilisation de Grega Play impliquent l’acceptation des présentes
              CGU. Si l’utilisateur n’accepte pas ces conditions, il ne doit pas utiliser le service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">3. Accès au service et compte</h2>
            <p className="text-gray-700">
              Certaines fonctionnalités nécessitent un compte. L’utilisateur s’engage à fournir des
              informations exactes et à protéger ses identifiants. Toute activité réalisée depuis le
              compte est réputée effectuée par l’utilisateur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">4. Fonctionnement des événements</h2>
            <p className="text-gray-700">
              L’organisateur crée l’événement et peut déclencher la génération de la vidéo finale.
              Les participants invités peuvent envoyer des vidéos selon les règles applicables
              (gratuit/Premium).
            </p>
            <p className="text-gray-700">
              Les vidéos envoyées ne peuvent pas être modifiées après envoi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">5. Gratuit et Premium</h2>
            <p className="text-gray-700">
              Grega Play propose un accès gratuit et des options Premium (compte et/ou événement).
              Les limites et avantages peuvent évoluer et sont détaillés dans l’application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">6. Contenus utilisateurs</h2>
            <p className="text-gray-700">
              L’utilisateur reste propriétaire de ses contenus. En utilisant Grega Play, il accorde
              à Grega Play une licence non exclusive permettant l’hébergement et le traitement
              (montage) strictement nécessaires au fonctionnement du service et à l’événement concerné.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">7. Contenus interdits</h2>
            <p className="text-gray-700">
              Il est interdit de publier des contenus illégaux, haineux, violents, pornographiques,
              portant atteinte à la vie privée, ou violant des droits de propriété intellectuelle
              sans autorisation. Grega Play peut retirer un contenu non conforme.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">8. Responsabilité</h2>
            <p className="text-gray-700">
              L’utilisateur est responsable des contenus qu’il publie. Grega Play ne garantit pas
              l’absence d’interruptions ou d’erreurs techniques et ne peut être tenu responsable
              qu’en cas de faute lourde avérée, selon la loi applicable.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">9. Données personnelles</h2>
            <p className="text-gray-700">
              Les modalités de traitement des données sont décrites dans la{" "}
              <Link
                to="/confidentialite"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline"
              >
                Politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">10. Modifications</h2>
            <p className="text-gray-700">
              Grega Play peut modifier les CGU et/ou le service. En cas de changement majeur, une
              information sera affichée dans l’application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">11. Contact</h2>
            <p className="text-gray-700">
              Contact : <span className="font-medium">contact@gregaplay.com</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CguPage;
