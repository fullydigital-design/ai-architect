import { motion } from 'motion/react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export function Footer({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const productLinks = [
    { label: 'Features', href: '#' },
    { label: 'Workflow', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Docs', href: '#' }
  ];

  const companyLinks = [
    { label: 'Contact', href: '#' },
    { label: 'Updates', href: '#' }
  ];

  const legalLinks = [
    { label: 'Privacy', onClick: () => onNavigate?.('privacy') },
    { label: 'Terms', onClick: () => onNavigate?.('terms') },
    { label: 'Impressum', onClick: () => onNavigate?.('impressum') }
  ];

  return (
    <footer className="relative bg-gradient-to-b from-white to-purple-50/30 border-t border-purple-100 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-black text-lg">FD</span>
              </div>
              <span className="text-gray-900 text-xl font-black">fullydigital.pictures</span>
            </div>
            <p className="text-content-faint text-sm leading-relaxed max-w-xs font-medium">
              fullydigital.pictures is an AI creative suite for advertising — currently in beta. Generate images and videos faster with a clean, production-friendly workflow.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-gray-900 font-black mb-4 uppercase text-sm tracking-wider">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-content-faint hover:text-fuchsia-600 transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-gray-900 font-black mb-4 uppercase text-sm tracking-wider">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-content-faint hover:text-fuchsia-600 transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-gray-900 font-black mb-4 uppercase text-sm tracking-wider">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href="#"
                    onClick={link.onClick}
                    className="text-content-faint hover:text-fuchsia-600 transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-purple-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-content-muted text-sm font-medium">
            © 2026 Hleb Likhodievski. All rights reserved.
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-100 to-purple-100 hover:from-fuchsia-600 hover:to-purple-600 flex items-center justify-center transition-all group"
            >
              <Twitter className="w-4 h-4 text-fuchsia-600 group-hover:text-white transition-colors" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-100 to-purple-100 hover:from-fuchsia-600 hover:to-purple-600 flex items-center justify-center transition-all group"
            >
              <Github className="w-4 h-4 text-fuchsia-600 group-hover:text-white transition-colors" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-100 to-purple-100 hover:from-fuchsia-600 hover:to-purple-600 flex items-center justify-center transition-all group"
            >
              <Linkedin className="w-4 h-4 text-fuchsia-600 group-hover:text-white transition-colors" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-100 to-purple-100 hover:from-fuchsia-600 hover:to-purple-600 flex items-center justify-center transition-all group"
            >
              <Mail className="w-4 h-4 text-fuchsia-600 group-hover:text-white transition-colors" />
            </a>
          </div>
        </div>

        {/* Alpha Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 pt-12 border-t border-amber-200/40"
        >
          <div className="p-6 pb-24 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200/60">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mt-0.5">
                <span className="text-white text-xs font-black">⚠</span>
              </div>
              <div className="flex-1">
                <h4 className="text-amber-900 font-black text-sm mb-2 uppercase tracking-wide">
                  Early Alpha Prototype
                </h4>
                <p className="text-amber-800 text-xs leading-relaxed font-medium">
                  This application is in <strong>early alpha stage</strong> and is currently a <strong>prototype for demonstration purposes only</strong>. 
                  All information displayed—including pricing, feature descriptions, documentation, and specifications—may be incomplete, inaccurate, or subject to change. 
                  Features may not function properly or as described. Text content has not been finalized and may contain errors. 
                  This prototype is intended for <strong>visual reference and testing only</strong>. 
                  Do not rely on any information presented here for production use or decision-making.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}