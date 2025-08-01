import React, { useState } from 'react';

const UploadTestPage = () => {
  const [eventId, setEventId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!eventId || !participantName || !file) {
      setMessage('⚠️ Remplis tous les champs.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    const url = `http://localhost:3000/api/videos/upload?eventId=${eventId}&participantName=${encodeURIComponent(participantName)}`;

    setLoading(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Erreur backend: ' + errText);
      }

      const data = await response.json();
      console.log('✅ Upload réussi:', data);
      setMessage('✅ Upload réussi !');
    } catch (err) {
      console.error('❌ Upload échoué:', err);
      setMessage('❌ Échec: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">🧪 Test Upload Vidéo</h2>
      <input
        className="border p-2 mb-2 w-full"
        placeholder="Event ID"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
      />
      <input
        className="border p-2 mb-2 w-full"
        placeholder="Nom du participant"
        value={participantName}
        onChange={(e) => setParticipantName(e.target.value)}
      />
      <input
        type="file"
        accept="video/*"
        className="border p-2 mb-2 w-full"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Téléversement...' : 'Envoyer la vidéo'}
      </button>

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
};

export default UploadTestPage;
