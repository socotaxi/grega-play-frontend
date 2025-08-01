import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import { toast } from 'react-toastify';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          `
        })
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Contact</h1>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              name="message"
              id="message"
              rows="4"
              value={formData.message}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>
          <div className="text-right">
            <Button type="submit" disabled={submitting} loading={submitting}>
              Envoyer
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ContactPage;
