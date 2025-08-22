import React, { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import supabase from "../lib/supabaseClient";

const CheckEmailPage = () => {
  const location = useLocation();
  const email = location.state?.email || ""; // ✅ récupère l'email transmis par RegisterForm
  const [resending, setResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Aucune adresse email fournie.");
      return;
    }

    try {
      setResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("Erreur envoi email :", error);
        toast.error("Impossible de renvoyer l'email. Réessayez plus tard.");
      } else {
        toast.success("Email de confirmation renvoyé 📩");
      }
    } catch (err) {
      console.error("Erreur inattendue :", err);
      toast.error("Une erreur est survenue.");
    } finally {
      setResending(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-6 py-12 bg-white rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          📩 Vérifiez votre boîte mail
        </h1>
        <p className="text-gray-700 mb-6 leading-relaxed">
          Merci pour votre inscription sur <strong>Grega Play</strong> 🎉
          <br />
          Pour activer votre compte, nous vous avons envoyé un email de
          confirmation à :
        </p>
        <p className="text-indigo-600 font-medium mb-6">{email}</p>
        <p className="text-gray-600 text-sm mb-8">
          ➡️ Cliquez sur le lien de validation dans cet email.
          <br />
          ⚠️ Si vous ne trouvez pas l’email, vérifiez vos{" "}
          <strong>spams</strong> ou <strong>courriers indésirables</strong>.
        </p>

        <Button
          onClick={handleResendEmail}
          loading={resending}
          variant="primary"
        >
          Renvoyer l’email de confirmation
        </Button>
      </div>
    </MainLayout>
  );
};

export default CheckEmailPage;
