import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          
          {/* Bloc texte à gauche */}
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Connecte-toi à Grega Play
            </h1>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Accède à tes événements en cours et passés.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Invite tes amis à participer et suivre leurs vidéos.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Génère facilement des vidéos finales prêtes à partager.</span>
              </li>
            </ul>

            <p className="mt-6 text-sm text-gray-700">
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
              >
                Créer un compte Grega Play
              </Link>
            </p>
          </div>

          {/* Carte de connexion à droite */}
          <div className="md:w-1/2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-7">
              <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center md:text-left">
                Connexion
              </h2>
              <p className="text-xs text-gray-500 mb-3 text-center md:text-left">
                Utilise ton <span className="font-medium">email ou ton numéro de téléphone</span> 
                comme identifiant.
              </p>
              <p className="text-xs text-gray-500 mb-5 text-center md:text-left">
                Tu peux aussi te connecter avec tes comptes <span className="font-medium">Google</span> ou <span className="font-medium">Whatsapp</span>,
                si ces options sont activées sur ton compte.
              </p>

              {/* Le formulaire gère les champs (email / téléphone / social logins) */}
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;
