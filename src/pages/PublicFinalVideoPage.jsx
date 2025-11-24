import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function PublicFinalVideoPage() {
  const { publicCode } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchFinalVideo() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/public/final-video/${publicCode}`
        );

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || "Impossible de charger la vidéo finale");
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error("Erreur chargement vidéo finale:", err);
        setError(err.message || "Impossible de charger la vidéo finale. Vérifie ta connexion ou réessaie dans quelques instants.");
      } finally {
        setLoading(false);
      }
    }

    if (publicCode) {
      fetchFinalVideo();
    }
  }, [publicCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-gray-50">
        <p className="text-gray-700 font-medium">Chargement de la vidéo finale…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white border border-red-200 rounded-2xl px-6 py-4 shadow-sm max-w-md text-center">
          <p className="text-red-600 font-semibold mb-2">
            Une erreur s’est produite
          </p>
          <p className="text-gray-600 text-sm">{error || "Vidéo introuvable"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex flex-col">
      {/* Header simple */}
      <header className="w-full px-4 py-4 flex items-center justify-between border-b border-emerald-100 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500" />
          <span className="font-semibold text-lg">Grega Play</span>
        </div>
        <button
          onClick={() => (window.location.href = "/")}
          className="text-sm underline text-emerald-700 hover:text-emerald-900"
        >
          Créer ma propre vidéo
        </button>
      </header>

      {/* Contenu */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-md p-6 border border-emerald-50">
          <h1 className="text-2xl font-bold mb-2">
            Vidéo finale – {data.title}
          </h1>

          {data.description && (
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              {data.description}
            </p>
          )}

          {/* Lecteur vidéo */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black mb-4">
            <video
              src={data.finalVideoUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>

          <p className="text-xs text-gray-500">
            Vidéo créée avec <span className="font-semibold">Grega Play</span> – L’émotion se construit ensemble.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PublicFinalVideoPage;
