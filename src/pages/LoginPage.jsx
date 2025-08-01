import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
       <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion à Grega Play
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pas encore de compte ?
            <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500"> S'inscrire</a>
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
            <LoginForm />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default LoginPage;