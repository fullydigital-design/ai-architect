import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, Settings } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const acceptAll = () => {
    const consent = {
      necessary: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    
    // Trigger storage event for GoogleAnalytics component
    window.dispatchEvent(new Event('storage'));
    
    setShowBanner(false);
  };

  const rejectAll = () => {
    const consent = {
      necessary: true,
      analytics: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    
    // Trigger storage event for GoogleAnalytics component
    window.dispatchEvent(new Event('storage'));
    
    setShowBanner(false);
  };

  const savePreferences = () => {
    const consent = {
      ...preferences,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    
    // Trigger storage event for GoogleAnalytics component
    window.dispatchEvent(new Event('storage'));
    
    setShowBanner(false);
    setShowSettings(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-200/60 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cookie className="w-6 h-6 text-white" />
                <h3 className="text-white font-black text-lg">Cookie Settings</h3>
              </div>
              <button
                onClick={rejectAll}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!showSettings ? (
                <>
                  <p className="text-content-faint text-sm leading-relaxed mb-6 font-medium">
                    We use cookies to remember your preferences and analyze website traffic with Google Analytics (optional). This is a non-commercial demonstration prototype.
                  </p>

                  {/* Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={acceptAll}
                      className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-bold"
                    >
                      Accept All Cookies
                    </Button>
                    <Button
                      onClick={rejectAll}
                      variant="outline"
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 font-bold"
                    >
                      Necessary Only
                    </Button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-bold flex items-center justify-center gap-2 py-2"
                    >
                      <Settings className="w-4 h-4" />
                      Customize Settings
                    </button>
                  </div>

                  <p className="text-xs text-content-muted mt-4 text-center">
                    By continuing to use our site, you agree to our{' '}
                    <button 
                      onClick={() => {
                        setShowBanner(false);
                        window.dispatchEvent(new CustomEvent('navigate-privacy'));
                      }}
                      className="text-purple-600 hover:underline font-bold"
                    >
                      Privacy Policy
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {/* Necessary Cookies */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900 mb-1">Necessary Cookies</h4>
                        <p className="text-xs text-content-faint">
                          Essential for the website to function. Store your cookie preferences.
                        </p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-12 h-6 rounded-full bg-gray-400 flex items-center justify-end px-1">
                          <div className="w-5 h-5 rounded-full bg-white" />
                        </div>
                      </div>
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900 mb-1">Analytics Cookies (Google Analytics)</h4>
                        <p className="text-xs text-content-faint">
                          Help us understand how visitors use our website. All data is anonymized.
                        </p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, analytics: !preferences.analytics })}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                          preferences.analytics ? 'bg-purple-600 justify-end' : 'bg-gray-300 justify-start'
                        } px-1`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={savePreferences}
                      className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-bold"
                    >
                      Save Preferences
                    </Button>
                    <Button
                      onClick={() => setShowSettings(false)}
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 font-bold"
                    >
                      Back
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}