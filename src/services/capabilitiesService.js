import supabase from "../lib/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3001";

export async function getEventCapabilities(eventId) {
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) {
    const err = new Error("Impossible de récupérer la session.");
    err.code = "SESSION_READ_FAILED";
    throw err;
  }

  const token = sessionData?.session?.access_token;
  if (!token) {
    const err = new Error("Non connecté.");
    err.code = "UNAUTHORIZED";
    err.status = 401;
    throw err;
  }

  const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/capabilities`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const err = new Error(json?.error?.message || "Erreur capabilities");
    err.code = json?.error?.code || "CAPABILITIES_FAILED";
    err.status = res.status;
    err.details = json?.error?.details;
    throw err;
  }

  return json; // { role, actions, limits, premium }
}
