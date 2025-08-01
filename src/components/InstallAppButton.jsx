import { useEffect, useState } from 'react';

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

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('✅ L\'utilisateur a accepté l\'installation');
    } else {
      console.log('❌ L\'utilisateur a refusé l\'installation');
    }

    setDeferredPrompt(null);
    setShowButton(false);
  };

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
