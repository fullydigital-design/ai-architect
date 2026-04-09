import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Menu, X, Home, GitBranch, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useState, useEffect } from 'react';

export function Navigation({ 
  onGetStarted, 
  onNavigate,
  currentPage = 'home'
}: { 
  onGetStarted?: () => void;
  onNavigate?: (page: string) => void;
  currentPage?: string;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect with debouncing for performance
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolled(window.scrollY > 50);
      }, 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navItems = [
    { label: 'Home', icon: Home, page: 'home', action: () => onNavigate?.('home') },
    { label: 'Features', icon: Sparkles, page: 'features', action: () => onNavigate?.('features') },
    { label: 'Workflow', icon: GitBranch, page: 'workflow', action: () => onNavigate?.('workflow') },
    { label: 'Docs', icon: BookOpen, page: 'docs', action: () => onNavigate?.('docs') }
  ];

  const handleNavClick = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-purple-500/10 border-b border-purple-100' 
            : 'bg-white/80 backdrop-blur-xl border-b border-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => onNavigate?.('home')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-black text-lg">FD</span>
              </div>
              <span className="text-gray-900 text-xl font-black">FD.pictures</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item, index) => {
                const isActive = currentPage === item.page;
                return (
                  <motion.button
                    key={index}
                    onClick={item.action}
                    className={`relative text-sm uppercase tracking-wider font-bold transition-all ${
                      isActive 
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-purple-600' 
                        : 'text-content-faint hover:text-fuchsia-600'
                    }`}
                    whileHover={{ scale: isActive ? 1.02 : 1.05 }}
                  >
                    {item.label}
                    
                    {/* Animated Gradient Underline */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        transition={{ 
                          type: 'spring',
                          stiffness: 400,
                          damping: 30
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-content-secondary hover:text-content-secondary hover:bg-gray-50 text-sm font-bold cursor-not-allowed opacity-50"
                disabled
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
              <Button 
                onClick={onGetStarted}
                className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all font-bold"
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button & CTA */}
            <div className="flex md:hidden items-center gap-3">
              <Button 
                onClick={onGetStarted}
                size="sm"
                className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/30 font-bold text-xs px-4"
              >
                Start
              </Button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-50 to-purple-50 hover:from-fuchsia-100 hover:to-purple-100 flex items-center justify-center transition-all border-2 border-purple-200 hover:border-purple-300"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Slide-In Menu */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <>
            {/* Backdrop - Optimized */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] md:hidden"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />

            {/* Slide-In Panel - Performance Optimized */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                duration: 0.25,
                ease: [0.32, 0.72, 0, 1] // Custom easing for smoothness
              }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 z-[70] md:hidden shadow-2xl"
              style={{ 
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            >
              <div className="relative h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <span className="text-white font-black text-base">FD</span>
                    </div>
                    <span className="text-white text-lg font-black">Menu</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-11 h-11 rounded-xl bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Navigation Items - Simplified animations */}
                <div className="flex-1 overflow-y-auto py-8 px-6">
                  <nav className="space-y-2">
                    {navItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.page;
                      return (
                        <button
                          key={index}
                          onClick={() => handleNavClick(item.action)}
                          className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group relative ${
                            isActive 
                              ? 'bg-white/30 border-2 border-white/50' 
                              : 'bg-white/10 active:bg-white/20 border-2 border-transparent'
                          }`}
                          style={{ 
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation'
                          }}
                        >
                          {/* Active Indicator - Simplified */}
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" />
                          )}
                          
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 ${
                            isActive ? 'bg-white/30 scale-110' : 'bg-white/10 group-active:bg-white/20'
                          }`}
                          style={{ willChange: 'transform' }}
                          >
                            <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                          </div>
                          <span className={`text-lg font-black transition-transform duration-200 ${
                            isActive ? 'text-white translate-x-1' : 'text-white/90 group-active:translate-x-1'
                          }`}
                          style={{ willChange: 'transform' }}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </nav>

                  {/* Divider */}
                  <div className="my-8 h-px bg-white/20" />

                  {/* Secondary Actions */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        onGetStarted?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-white text-purple-600 active:bg-purple-50 border-0 py-6 rounded-2xl font-black text-lg shadow-xl"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      Get Started
                    </Button>
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 opacity-50 cursor-not-allowed transition-colors duration-200"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <LogIn className="w-4 h-4 text-white/60" />
                      <span className="text-white/60 text-sm font-bold">Login</span>
                    </button>
                  </div>
                </div>

                {/* Footer Badge */}
                <div className="p-6 border-t border-white/20">
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10">
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-bold">Beta · Free</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}