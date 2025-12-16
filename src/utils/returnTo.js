// src/utils/returnTo.js
const KEY = "gp_returnTo";

export function setReturnTo(url) {
  try {
    localStorage.setItem(KEY, url);
  } catch {}
}

export function getReturnTo() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearReturnTo() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
