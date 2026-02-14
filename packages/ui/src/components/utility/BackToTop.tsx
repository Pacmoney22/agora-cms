import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { ArrowUp } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export interface BackToTopProps {
  showAfterScroll?: number;
  icon?: string;
  position?: 'bottom-right' | 'bottom-left';
  style?: 'circle' | 'rounded' | 'square';
  smoothScroll?: boolean;
  className?: string;
}

const positionClasses: Record<string, string> = {
  'bottom-right': 'fixed bottom-6 right-6',
  'bottom-left': 'fixed bottom-6 left-6',
};

const styleClasses: Record<string, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-lg',
  square: 'rounded-none',
};

export const BackToTop: React.FC<BackToTopProps> = ({
  showAfterScroll = 300,
  icon = 'ArrowUp',
  position = 'bottom-right',
  style = 'circle',
  smoothScroll = true,
  className,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > showAfterScroll);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showAfterScroll]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [smoothScroll]);

  const IconComponent =
    (LucideIcons as unknown as Record<string, React.FC<{ size?: number; className?: string }>>)[icon] ||
    ArrowUp;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={clsx(
        positionClasses[position],
        styleClasses[style],
        'z-40 flex h-12 w-12 items-center justify-center bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
        className,
      )}
    >
      <IconComponent size={20} />
    </button>
  );
};
