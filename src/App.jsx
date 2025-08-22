import React from "react";
import { BrowserRouter } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
import CheckEmailPage from "./pages/CheckEmailPage";
import EventDetailsPage from "./pages/EventDetailsPage";


// Layout
import MainLayout from "./components/layout/MainLayout";

const App = () => {
  return (
    <>
      {/* ✅ ToastContainer pour react-toastify (remplace react-hot-toast) */}
      <ToastContainer position="top-center" autoClose={3000} />

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
        <Route path="/events/:eventId/manage-participants" element={<ManageParticipantsPage />} />
        <Route path="/invitation/:token" element={<InvitationPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />
      </Routes>
    </>
  );
};

export default App;
