import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { tokens } from '@/styles/tokens';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.scrollY;
        
        // Prevent NaN by checking if documentHeight is valid
        if (documentHeight > 0) {
          const progressPercent = (scrolled / documentHeight) * 100;
          setProgress(Math.min(100, Math.max(0, progressPercent)));
        } else {
          setProgress(0);
        }
      }, 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-1 bg-gray-200/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: progress > 0 ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`h-full bg-gradient-to-r ${tokens.gradients.primary}`}
        style={{ width: `${progress}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
      />
    </motion.div>
  );
}