import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";
import MainLayout from "../components/layout/MainLayout";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

const PAGE_SIZE = 4;

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(data || []);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`notif-page:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setPage(1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const markAsRead = async (notif) => {
    if (!notif.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    if (notif.link) {
      try {
        const url = new URL(notif.link);
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search + url.hash);
        } else {
          window.location.href = notif.link;
        }
      } catch {
        navigate(notif.link);
      }
    }
  };

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = async () => {
    if (!notifications.length) return;
    setClearing(true);
    const res = await fetch(`${API_BASE_URL}/api/notifications/all`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ userId: user.id }),
    });
    if (!res.ok) {
      console.error("Erreur clearAll notifications:", await res.text());
      setClearing(false);
      return;
    }
    setNotifications([]);
    setPage(1);
    setClearing(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paginated = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-sm text-purple-600 hover:underline"
              >
                Tout marquer lu
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                disabled={clearing}
                className="text-sm text-red-500 hover:underline disabled:opacity-50"
              >
                {clearing ? "Suppression…" : "Tout effacer"}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-gray-400 py-16">
            Aucune notification pour l&apos;instant
          </p>
        ) : (
          <>
            <div className="divide-y divide-gray-100 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {paginated.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition ${
                    !notif.read ? "bg-purple-50/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-2 flex-shrink-0 h-2 w-2 rounded-full ${
                        !notif.read ? "bg-purple-500" : "bg-transparent"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !notif.read
                            ? "font-semibold text-gray-900"
                            : "text-gray-600"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Précédent
                </button>
                <span className="text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;
