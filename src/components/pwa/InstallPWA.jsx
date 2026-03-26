import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "../../lib/supabaseClient";

async function trackInstallEvent(platform) {
  try {
    await supabase.from('app_install_events').insert([{ platform }]);
  } catch (e) {
    console.error('Erreur tracking installation:', e);
  }
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await trackInstallEvent('pwa_component');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  useEffect(() => {
    const handler = () => trackInstallEvent('pwa_component_appinstalled');
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const handleClose = () => setShowInstall(false);

  return (
    <AnimatePresence>
      {showInstall && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h2 className="text-xl font-bold mb-4">📲 Installer Grega Play</h2>
            <p className="text-gray-600 mb-6">
              Installe Grega Play directement sur ton appareil pour une
              expérience plus rapide et sans navigateur.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow"
              >
                Installer
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl"
              >
                Plus tard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
