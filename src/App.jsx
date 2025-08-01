import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import ContactPage from "./pages/ContactPage";
import CreateEventPage from "./pages/CreateEventPage";
import InvitationPage from "./pages/InvitationPage";
import SubmitVideoPage from "./pages/SubmitVideoPage";
import FinalVideoPage from "./pages/FinalVideoPage";
import ManageParticipantsPage from "./pages/ManageParticipantsPage";
import UploadTestPage from "./pages/UploadTestPage"; // ajoute cette ligne en haut avec les autres imports

// Layout & Auth
import MainLayout from "./components/layout/MainLayout";
import { AuthProvider } from "./context/AuthContext";

const App = () => {
  return (
    <AuthProvider>
      <Toaster position="top-center" />

    
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/create-event" element={<CreateEventPage />} />
          <Route path="/invite/:eventId" element={<InvitationPage />} />
          <Route path="/submit/:eventId" element={<SubmitVideoPage />} />
          <Route path="/event/:eventId/final" element={<FinalVideoPage />} />
          <Route path="/event/:eventId/manage" element={<ManageParticipantsPage />} />
          <Route path="/invitation/:token" element={<InvitationPage />} />
          <Route path="/events/:eventId/participants" element={<ManageParticipantsPage />} />
          <Route path="/upload-test" element={<UploadTestPage />} />

        </Routes>
      
    </AuthProvider>
  );
};

export default App;
