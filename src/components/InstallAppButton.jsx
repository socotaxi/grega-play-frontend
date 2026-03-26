import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

async function trackInstallEvent(platform) {
  try {
    await supabase.from('app_install_events').insert([{ platform }]);
  } catch (e) {
    console.error('Erreur tracking installation:', e);
  }
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // Empêche le prompt automatique
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await trackInstallEvent('install_button');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowButton(false);
  };

  useEffect(() => {
    const handler = () => trackInstallEvent('install_button_appinstalled');
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  if (!showButton) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="px-4 py-2 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all"
    >
      📲 Installer Grega Play
    </button>
  );
}
