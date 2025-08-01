import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <img
            className="mx-auto h-12 w-auto"
            src="/logo192.png"
            alt="Grega Play"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer un compte Grega Play
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Se connecter
            </a>
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <RegisterForm />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RegisterPage;