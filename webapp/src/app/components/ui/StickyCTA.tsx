import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { tokens } from '@/styles/tokens';

interface StickyCTAProps {
  onGetStarted?: () => void;
}

export function StickyCTA({ onGetStarted }: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Show after scrolling 50% of viewport
        setIsVisible(window.scrollY > window.innerHeight * 0.5);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t-2 border-purple-200 shadow-2xl shadow-purple-500/20"
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Text */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Ready to create better ads?</p>
                  <p className="text-xs text-content-faint font-medium">Free during beta · No credit card required</p>
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={onGetStarted}
                className={`bg-gradient-to-r ${tokens.gradients.primary} hover:${tokens.gradients.primaryHover} text-white border-0 ${tokens.shadows.button} hover:${tokens.shadows.buttonHover} font-bold px-8 py-3 rounded-xl`}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
