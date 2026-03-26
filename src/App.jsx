import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Lazy-loaded pages — chaque page est chargée uniquement quand elle est visitée
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CreateEventPage = lazy(() => import("./pages/CreateEventPage"));
const InvitationPage = lazy(() => import("./pages/InvitationPage"));
const SubmitVideoPage = lazy(() => import("./pages/SubmitVideoPage"));
const FinalVideoPage = lazy(() => import("./pages/FinalVideoPage"));
const ManageParticipantsPage = lazy(() => import("./pages/ManageParticipantsPage"));
const CheckEmailPage = lazy(() => import("./pages/CheckEmailPage"));
const EventDetailsPage = lazy(() => import("./pages/EventDetailsPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PublicEventPage = lazy(() => import("./pages/PublicEventPage"));
const AdminStatsPage = lazy(() => import("./pages/AdminStatsPage"));
const VerifyPhonePage = lazy(() => import("./pages/VerifyPhonePage"));
const PublicFinalVideoPage = lazy(() => import("./pages/PublicFinalVideoPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const CheckoutPremiumPage = lazy(() => import("./pages/CheckoutPremiumPage"));
const CguPage = lazy(() => import("./pages/CguPage"));
const ConfidentialitePage = lazy(() => import("./pages/ConfidentialitePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

const App = () => {
  return (
    <>
      {/* Toast notifications */}
      <ToastContainer position="top-center" autoClose={3000} />

      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="loader" /></div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/create-event" element={<CreateEventPage />} />
          <Route path="/invite/:eventId" element={<InvitationPage />} />
          <Route path="/submit-video/:eventId" element={<SubmitVideoPage />} />
          <Route path="/events/:eventId/final" element={<FinalVideoPage />} />
          <Route
            path="/events/:eventId/manage-participants"
            element={<ManageParticipantsPage />}
          />
          <Route path="/invitation/:token" element={<InvitationPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/events/:eventId" element={<EventDetailsPage />} />
          <Route path="/events/:eventId/submit" element={<SubmitVideoPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/e/:publicCode" element={<PublicEventPage />} />
          {/* player public */}
          <Route path="/player/:publicCode" element={<PublicFinalVideoPage />} />
          {/* page admin */}
          <Route path="/admin/stats" element={<AdminStatsPage />} />
          <Route path="/verify-phone" element={<VerifyPhonePage />} />
          {/* page Premium */}
          <Route path="/premium" element={<PremiumPage />} />
          {/* tunnel de paiement Premium */}
          <Route path="/checkout-premium" element={<CheckoutPremiumPage />} />
          {/* CGU + Politique de confidentialité */}
          <Route path="/cgu" element={<CguPage />} />
          <Route path="/confidentialite" element={<ConfidentialitePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
