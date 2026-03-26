import { useState, useEffect, useCallback } from 'react';

const KEY = (uid) => `gp_tour_${uid}`;

const load = (uid) => {
  try {
    const v = localStorage.getItem(KEY(uid));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};

const save = (uid, data) => {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(data));
  } catch {}
};

/**
 * Manages the 3-step onboarding tour state via localStorage.
 * Steps:
 *   1 — dashboard empty state: highlight "Créer un événement" CTA
 *   2 — dashboard with events: highlight share link section
 *   3 — dashboard with events: highlight WhatsApp share button
 */
export const useOnboardingTour = (userId, hasEvents) => {
  const [state, setState] = useState(null);

  // Load from localStorage on mount / userId change
  useEffect(() => {
    if (!userId) return;
    const stored = load(userId);
    if (stored) {
      setState(stored);
    } else {
      const initial = { step: 1, completed: false };
      save(userId, initial);
      setState(initial);
    }
  }, [userId]);

  // Auto-advance step 1→2 when the user creates their first event
  useEffect(() => {
    if (!userId || !state) return;
    if (!state.completed && state.step === 1 && hasEvents) {
      const next = { step: 2, completed: false };
      save(userId, next);
      setState(next);
    }
  }, [hasEvents, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (!userId || !state) return;
    const nextStep = state.step + 1;
    const next = nextStep > 3
      ? { step: 3, completed: true }
      : { step: nextStep, completed: false };
    save(userId, next);
    setState(next);
  }, [userId, state]);

  const skip = useCallback(() => {
    if (!userId) return;
    const next = { step: 3, completed: true };
    save(userId, next);
    setState(next);
  }, [userId]);

  if (!state || state.completed) {
    return { activeStep: null, advance, skip };
  }

  return { activeStep: state.step, advance, skip };
};
