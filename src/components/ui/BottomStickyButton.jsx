// src/components/ui/BottomStickyButton.jsx
import React from 'react';
import Button from './Button';
import clsx from 'clsx';

/**
 * Bouton principal sticky en bas de l'écran (mobile-first).
 *
 * Props possibles :
 * - children : contenu du bouton (texte + icône éventuelle)
 * - onClick  : callback au clic
 * - disabled : désactive le bouton
 * - loading  : état de chargement (passé au Button)
 * - className: classes supplémentaires pour le conteneur
 * - buttonClassName : classes supplémentaires pour le <Button>
 * - variant : variante du Button ("primary", "secondary", etc. selon ton implémentation)
 * - fullWidthDesktop : si true, le bouton garde la pleine largeur aussi sur desktop
 */
const BottomStickyButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  buttonClassName = '',
  variant = 'primary',
  fullWidthDesktop = false,
  ...buttonProps
}) => {
  return (
    <div
      className={clsx(
        // Sticky mobile
        'fixed inset-x-0 bottom-0 z-40 md:static md:z-auto',
        className,
      )}
    >
      <div
        className={clsx(
          'mx-auto w-full max-w-3xl px-4',
          // Fond blanc semi-transparent + blur sur mobile
          'pb-4 pt-2 bg-white/95 backdrop-blur border-t border-gray-200',
          // Sur desktop, on enlève le fond/border pour éviter l’effet barre sticky
          'md:bg-transparent md:border-none md:pb-0 md:pt-4',
        )}
      >
        <Button
          type="button"
          onClick={onClick}
          disabled={disabled}
          loading={loading}
          variant={variant}
          className={clsx(
            'text-sm font-semibold py-3 rounded-full shadow-md shadow-emerald-500/20',
            'w-full',
            !fullWidthDesktop && 'md:w-auto md:px-6',
            buttonClassName,
          )}
          {...buttonProps}
        >
          {children}
        </Button>
      </div>
    </div>
  );
};

export default BottomStickyButton;
