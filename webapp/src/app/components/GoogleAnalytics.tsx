import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    // Check if user has consented to analytics cookies
    const checkConsent = () => {
      const consent = localStorage.getItem('cookie-consent');
      
      if (!consent) {
        return false;
      }

      try {
        const parsed = JSON.parse(consent);
        return parsed.analytics === true;
      } catch (e) {
        return false;
      }
    };

    // Load Google Analytics only if user has consented
    if (checkConsent()) {
      loadGoogleAnalytics();
    }

    // Listen for consent changes
    const handleConsentChange = () => {
      if (checkConsent()) {
        loadGoogleAnalytics();
      } else {
        // Remove GA if consent is withdrawn
        removeGoogleAnalytics();
      }
    };

    window.addEventListener('storage', handleConsentChange);

    return () => {
      window.removeEventListener('storage', handleConsentChange);
    };
  }, []);

  return null;
}

function loadGoogleAnalytics() {
  // Check if already loaded
  if (document.querySelector('script[src*="googletagmanager.com/gtag"]')) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  
  // Set timestamp
  window.gtag('js', new Date());

  // Configure with IP anonymization for GDPR compliance
  window.gtag('config', 'G-FF9GQ615ES', {
    'anonymize_ip': true,
    'cookie_flags': 'SameSite=None;Secure'
  });

  // Create and append script tag
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-FF9GQ615ES';
  document.head.appendChild(script);

  console.log('✅ Google Analytics loaded (user consented)');
}

function removeGoogleAnalytics() {
  // Remove GA script if it exists
  const scripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag"]');
  scripts.forEach(script => script.remove());

  // Clear dataLayer
  if (window.dataLayer) {
    window.dataLayer = [];
  }

  // Remove GA cookies
  const gaCookies = document.cookie.split(';').filter(cookie => {
    const name = cookie.trim().split('=')[0];
    return name.startsWith('_ga') || name.startsWith('_gid');
  });

  gaCookies.forEach(cookie => {
    const name = cookie.trim().split('=')[0];
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });

  console.log('❌ Google Analytics removed (user withdrew consent)');
}
