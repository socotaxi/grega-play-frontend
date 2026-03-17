import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import InstallAppButton from '../InstallAppButton';

const DashboardHeader = ({ user, profile, premiumAccountLabel }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de bord</h1>
      <p className="mt-1 text-sm text-gray-600">
        Bienvenue, {profile?.full_name || user?.user_metadata?.full_name || user?.email}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Gère tes projets vidéo, invite des participants et suis l&apos;avancement de tes montages Grega Play.
      </p>
      {premiumAccountLabel && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 inline-flex px-3 py-1 rounded-full border border-amber-200">
          {premiumAccountLabel}
        </p>
      )}
    </div>
    <div className="flex flex-col items-stretch md:items-end gap-3">
      <InstallAppButton />
      <Link to="/create-event" className="w-full md:w-auto">
        <Button className="w-full md:w-auto py-2.5 text-sm font-semibold inline-flex items-center justify-center">
          <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer un nouvel événement
        </Button>
      </Link>
    </div>
  </div>
);

export default DashboardHeader;
