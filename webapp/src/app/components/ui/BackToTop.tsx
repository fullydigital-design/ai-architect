import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { tokens } from '@/styles/tokens';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsVisible(window.scrollY > 500);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className={`fixed bottom-24 right-8 z-40 w-14 h-14 ${tokens.radius.full} bg-gradient-to-r ${tokens.gradients.primary} ${tokens.shadows.button} hover:${tokens.shadows.buttonHover} ${tokens.transitions.default} flex items-center justify-center group`}
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}