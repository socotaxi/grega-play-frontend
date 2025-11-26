import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          
          {/* Bloc texte à gauche (cohérent avec LoginPage) */}
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Crée ton compte Grega Play
            </h1>
            <p className="text-base text-gray-600 mb-4">
              En quelques secondes, tu peux commencer à créer des événements,
              inviter tes proches et générer des vidéos souvenirs automatiquement.
            </p>
            <p className="mt-6 text-sm text-gray-700">
              Tu as déjà un compte ?{' '}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>

          {/* Carte d’inscription à droite */}
          <div className="md:w-1/2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 py-7">
              <h2 className="text-xl font-semibold text-gray-900 mb-1 text-center md:text-left">
                Inscription
              </h2>
              <p className="text-xs text-gray-500 mb-3 text-center md:text-left">
                Crée ton compte avec ton <span className="font-medium">email</span> et un mot de passe sécurisé.
              </p>
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RegisterPage;
