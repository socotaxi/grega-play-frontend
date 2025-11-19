import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/functions/v1/send-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'contact@grega-play.com',
          subject: `📩 Message depuis Grega Play - ${formData.name}`,
          content: `
Nom : ${formData.name}
Email : ${formData.email}

Message :
${formData.message}
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur function:', errorText);
        toast.error("Erreur lors de l'envoi de l'email.");
        return;
      }

      toast.success('Votre message a été envoyé avec succès.');
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Erreur de soumission:', err);
      toast.error("Une erreur s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-80px)] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Bloc texte / infos à gauche */}
          <div className="md:w-1/2">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Contacte l’équipe Grega Play
            </h1>
            <p className="text-base text-gray-600 mb-4">
              Une question sur l’application, un problème technique ou une
              idée de fonctionnalité&nbsp;? Écris-nous et nous te répondons
              dès que possible.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Support sur la création ou la gestion d’événements.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Retour sur un bug, une erreur ou une incompréhension.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <span>Partenariats, suggestions ou demandes spéciales.</span>
              </li>
            </ul>

            <div className="mt-6 text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">Email direct</p>
              <p>contact@grega-play.com</p>
              <p className="text-xs text-gray-500">
                Tu peux aussi nous écrire directement depuis ce formulaire.
              </p>
            </div>
          </div>

          {/* Formulaire dans une carte à droite */}
          <div className="md:w-1/2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Envoyer un message
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Merci de détailler ta demande pour que nous puissions te
                répondre plus efficacement.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    Nom
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ton nom ou prénom"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="ton.email@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    Message
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    placeholder="Explique-nous en quelques lignes ce que tu souhaites."
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    loading={submitting}
                    className="w-full py-2.5 text-sm font-semibold"
                  >
                    Envoyer le message
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContactPage;
