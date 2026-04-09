import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { CookieBanner } from '@/app/components/CookieBanner';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';
import { motion, AnimatePresence } from 'motion/react';

interface PageLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate?: (page: string) => void;
  onGetStarted?: () => void;
}

export function PageLayout({ children, currentPage, onNavigate, onGetStarted }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - stays mounted, doesn't re-render */}
      <Navigation 
        onGetStarted={onGetStarted}
        onNavigate={onNavigate}
        currentPage={currentPage}
      />
      
      {/* Disclaimer Banner - fixed below navigation */}
      <DisclaimerBanner />

      {/* Page Content - smooth transitions with padding for fixed nav + banner */}
      <div className="pt-[125px]">
        <AnimatePresence mode="wait">
          <motion.main
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Footer - stays mounted, doesn't re-render */}
      <Footer onNavigate={onNavigate} />
      <CookieBanner />
    </div>
  );
}