import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import supabase from "../../lib/supabaseClient";

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

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [clearing, setClearing] = useState(false);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paginated = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Chargement initial + realtime
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(data || []);
    };

    load();

    const channel = supabase
      .channel(`notif-bell:${user.id}`)
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

  // Fermeture au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset page à l'ouverture
  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev) setPage(1);
      return !prev;
    });
  };

  const markAsRead = async (notif) => {
    setOpen(false);
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

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      {/* Bouton cloche */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-purple-600 hover:underline"
                >
                  Tout marquer lu
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={clearing}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {clearing ? "…" : "Tout effacer"}
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          <div className="divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">
                Aucune notification pour l&apos;instant
              </p>
            ) : (
              paginated.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                    !notif.read ? "bg-purple-50/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 flex-shrink-0 h-2 w-2 rounded-full ${
                        !notif.read ? "bg-purple-500" : "bg-transparent"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !notif.read ? "font-semibold text-gray-900" : "text-gray-600"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Préc.
              </button>
              <span className="text-xs text-gray-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suiv. →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
