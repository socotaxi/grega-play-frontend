import { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';

const PADDING = 10; // px around the spotlight hole
const TOOLTIP_WIDTH = 300;

const STEPS = {
  1: {
    selector: '[data-onboarding="create-btn"]',
    side: 'bottom',
    badge: '1 / 3',
    title: 'Crée ton premier événement',
    message:
      "Lance-toi ! Crée un événement pour que tes invités puissent t'envoyer leurs vidéos.",
    cta: 'Créer un événement',
    ctaType: 'navigate',
  },
  2: {
    selector: '[data-onboarding="share-link"]',
    side: 'top',
    badge: '2 / 3',
    title: 'Copie ton lien de partage',
    message:
      "Envoie ce lien à tes invités. Chacun pourra soumettre sa vidéo depuis n'importe quel appareil.",
    cta: "C'est noté !",
    ctaType: 'advance',
  },
  3: {
    selector: '[data-onboarding="whatsapp-btn"]',
    side: 'top',
    badge: '3 / 3',
    title: 'Partage en un clic sur WhatsApp',
    message:
      'Invite tes proches directement via WhatsApp pour maximiser les participations !',
    cta: 'Terminer le tour ✓',
    ctaType: 'complete',
  },
};

/**
 * Spotlight-style onboarding tour.
 * Renders a dark overlay with a "hole" cut out around the target element.
 * Props:
 *   activeStep — 1 | 2 | 3 | null
 *   onAdvance  — advance to next step
 *   onSkip     — dismiss tour entirely
 */
const OnboardingTour = ({ activeStep, onAdvance, onSkip }) => {
  const navigate = useNavigate();
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  const config = activeStep ? STEPS[activeStep] : null;

  const measureTarget = useCallback(() => {
    if (!config) return;
    const el = document.querySelector(config.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setRect(null);
    }
  }, [config]);

  useEffect(() => {
    if (!activeStep || !config) {
      setRect(null);
      return;
    }

    // Small delay so the DOM settles (e.g. after navigation / data load)
    const tid = setTimeout(() => {
      measureTarget();
      const el = document.querySelector(config.selector);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    const onResize = () => measureTarget();
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measureTarget);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeStep, config, measureTarget]);

  if (!activeStep || !config) return null;

  const handleCTA = () => {
    if (config.ctaType === 'navigate') {
      onAdvance();
      navigate('/create-event');
    } else {
      onAdvance();
    }
  };

  // Tooltip position: centred on target, above or below
  const tooltipStyle = (() => {
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }
    const centreX = rect.left + rect.width / 2;
    const left = Math.max(
      12,
      Math.min(centreX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - 12)
    );
    if (config.side === 'bottom') {
      return { top: rect.top + rect.height + PADDING + 14, left };
    }
    // side === 'top'
    return { bottom: window.innerHeight - rect.top + PADDING + 14, left };
  })();

  // Arrow pointing toward the spotlight hole
  const arrowStyle =
    config.side === 'bottom'
      ? {
          position: 'absolute',
          top: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderBottom: '8px solid #4f46e5',
        }
      : {
          position: 'absolute',
          bottom: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '8px solid #4f46e5',
        };

  return ReactDOM.createPortal(
    <>
      {/* ── Spotlight hole overlay ─────────────────────────────── */}
      {rect ? (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            borderRadius: 14,
            zIndex: 9998,
            pointerEvents: 'none',
            transition: 'top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
          }}
        />
      ) : (
        /* fallback full backdrop when target not found yet */
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 9997,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Tooltip ───────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`Onboarding étape ${activeStep}`}
        style={{
          position: 'fixed',
          zIndex: 9999,
          width: TOOLTIP_WIDTH,
          ...tooltipStyle,
        }}
      >
        {/* Arrow */}
        <div style={arrowStyle} aria-hidden="true" />

        {/* Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            borderRadius: 16,
            padding: '18px 20px 16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            color: '#fff',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 99 }}>
              Étape {config.badge}
            </span>
            <button
              onClick={onSkip}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              Passer
            </button>
          </div>

          {/* Title */}
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
            {config.title}
          </p>

          {/* Message */}
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.5, opacity: 0.9 }}>
            {config.message}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                style={{
                  width: n === activeStep ? 18 : 6,
                  height: 6,
                  borderRadius: 99,
                  background: n === activeStep ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'width 0.25s ease',
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleCTA}
            style={{
              width: '100%',
              background: '#fff',
              color: '#4f46e5',
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {config.cta}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default OnboardingTour;
