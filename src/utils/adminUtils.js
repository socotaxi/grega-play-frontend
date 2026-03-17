// Constantes et fonctions utilitaires partagées entre la page AdminStats
// et le hook useAdminStats.

export const ADMIN_EMAIL = 'edhemrombhot@gmail.com';
export const DISPLAY_CURRENCY = 'XOF';
export const DISPLAY_LOCALE = 'fr-FR';

export const safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const toIsoDateTime = (d) => {
  try {
    return new Date(d).toISOString();
  } catch {
    return null;
  }
};

export const computeExpiresAt = (duration) => {
  const now = new Date();
  if (duration === 'forever') {
    const far = new Date(Date.UTC(2099, 11, 31, 23, 59, 59));
    return far.toISOString();
  }
  const days = Number(duration);
  const d = new Date(now);
  d.setDate(d.getDate() + (Number.isFinite(days) ? days : 30));
  return d.toISOString();
};

export const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return String(iso);
  }
};

export const isPremiumActive = (flag, expiresAt) => {
  if (!flag) return false;
  if (!expiresAt) return true;
  try {
    return new Date(expiresAt).getTime() > Date.now();
  } catch {
    return true;
  }
};

export const formatAmount = (xofAmount) => {
  const amount = Number(xofAmount || 0);
  try {
    return amount.toLocaleString(DISPLAY_LOCALE, {
      style: 'currency',
      currency: DISPLAY_CURRENCY,
      maximumFractionDigits: 0,
    });
  } catch {
    return `${Math.round(amount).toLocaleString(DISPLAY_LOCALE)} F CFA`;
  }
};

export const formatPercent = (value) => {
  if (value == null) return '0 %';
  return `${Number(value).toFixed(1)} %`;
};
