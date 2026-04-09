import { motion } from 'motion/react';
import { ArrowLeft, Shield, Mail } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';

interface PrivacyPageProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function PrivacyPage({ onNavigate, currentPage }: PrivacyPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage={currentPage} onNavigate={onNavigate} />
      <DisclaimerBanner />
      
      {/* Header */}
      <section className="relative bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 pt-[145px] pb-20 border-b border-purple-100">
        <div className="max-w-4xl mx-auto px-6">
          <Button
            variant="ghost"
            onClick={() => onNavigate('home')}
            className="mb-8 text-purple-700 hover:text-purple-900 hover:bg-purple-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/30 mb-6">
              <Shield className="w-5 h-5 text-white" />
              <span className="text-sm text-white font-bold">GDPR Compliant</span>
            </div>
            <h1 className="text-6xl font-black text-gray-900 mb-6">
              Privacy <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Policy</span>
            </h1>
            <p className="text-xl text-gray-600 font-medium">
              Last updated: January 28, 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="prose prose-lg max-w-none"
          >
            <div className="space-y-12">
              {/* Section 1 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">1. Introduction</h2>
                <p className="text-gray-600 leading-relaxed">
                  This Privacy Policy explains how Hleb Likhodievski ("we", "us", or "our") collects, uses, and protects your personal information when you visit our website. We are committed to protecting your privacy and complying with the EU General Data Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG).
                </p>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">2. Data Controller</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  The data controller responsible for your personal data is:
                </p>
                <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-xl">
                  <p className="font-bold text-gray-900">Hleb Likhodievski</p>
                  <p className="text-gray-700 mt-2">Marienthaler Straße 35</p>
                  <p className="text-gray-700">20535 Hamburg, Germany</p>
                  <p className="text-gray-700 flex items-center gap-2 mt-3">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <a href="mailto:likhodievskihleb@gmail.com" className="text-purple-600 hover:underline">
                      likhodievskihleb@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">3. Data We Collect</h2>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">3.1 No Personal Data Collection</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  This website is a <strong>non-commercial demonstration prototype</strong>. We do not collect, store, or process any personal information directly. There are no contact forms, user accounts, or registration systems on this website.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">3.2 Automatically Collected Data (Google Analytics - Optional)</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  If you consent to analytics cookies, we use Google Analytics to understand website usage patterns. Google Analytics may automatically collect:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>IP address (anonymized)</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Referral source</li>
                  <li>Pages visited and time spent on pages</li>
                  <li>Date and time of access</li>
                  <li>Approximate geographic location (country/city level)</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  <strong>Important:</strong> All Google Analytics data is anonymized and aggregated. You can opt out at any time by changing your cookie preferences.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">3.3 Cookies</h3>
                <p className="text-gray-600 leading-relaxed">
                  We use cookies to enhance your browsing experience and to remember your cookie preferences. For analytics purposes, Google Analytics cookies are only set if you explicitly consent through our cookie banner. For more information, please see our Cookie Policy section below.
                </p>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">4. Legal Basis for Processing</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  We process your personal data based on the following legal grounds:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> When you contact us or accept cookies</li>
                  <li><strong>Legitimate interests (Art. 6(1)(f) GDPR):</strong> To improve our website and respond to your inquiries</li>
                  <li><strong>Legal obligation (Art. 6(1)(c) GDPR):</strong> When required by German or EU law</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">5. How We Use Your Data</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Since this is a non-commercial demonstration prototype, we only use data for the following limited purposes:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>To analyze website usage and trends (if you consent to Google Analytics)</li>
                  <li>To improve the prototype and user experience</li>
                  <li>To maintain website security</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">6. Data Sharing and Third Parties</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We use the following third-party services to operate our website:
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">6.1 Figma (Website Hosting)</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Our website is hosted by Figma. As our hosting provider, Figma may collect technical data such as server logs, IP addresses, and access times as part of their standard hosting operations. Figma's handling of this data is governed by their own privacy policy. We do not have direct control over Figma's server logs or their retention periods.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">6.2 Google Analytics (Optional)</h3>
                <p className="text-gray-600 leading-relaxed">
                  If you consent to analytics cookies, we use Google Analytics to understand how visitors use our website. Google Analytics collects information such as pages visited, time spent on pages, browser type, and referral sources. This data is anonymized and aggregated. Google Analytics data is automatically deleted after 14 months. You can opt out of Google Analytics by rejecting analytics cookies in our cookie settings.
                </p>
                
                <p className="text-gray-600 leading-relaxed mt-4">
                  <strong>Google Analytics Configuration:</strong>
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-2">
                  <li>IP Anonymization: Enabled (your full IP address is never stored)</li>
                  <li>Data Retention: 14 months (automatic deletion)</li>
                  <li>Data Processing Agreement: Signed with Google</li>
                  <li>Google's Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">policies.google.com/privacy</a></li>
                </ul>

                <p className="text-gray-600 leading-relaxed mt-6 font-bold">
                  We do not sell, rent, or trade your personal data to third parties for marketing purposes.
                </p>
              </div>

              {/* Section 7 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">7. Data Retention</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We retain your personal data only for as long as necessary. Here's how we manage data retention:
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">7.1 Google Analytics Data</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  If you have consented to analytics cookies, Google Analytics data is automatically deleted after 14 months. This is configured in our Google Analytics settings and happens automatically - no action is required from you.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">7.2 Cookie Preferences</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Your cookie preferences are stored locally in your browser's storage. This data remains on your device until you clear your browser data or change your preferences. We do not have access to this data - it stays on your device only.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">7.3 Technical Logs (Hosting Provider)</h3>
                <p className="text-gray-600 leading-relaxed">
                  Server logs and technical data collected by Figma (our hosting provider) are managed according to Figma's own data retention policies. We do not have direct control over these logs. For information about Figma's data practices, please refer to Figma's Privacy Policy.
                </p>
              </div>

              {/* Section 8 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">8. Your Rights Under GDPR</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  Under the GDPR, you have the following rights:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li><strong>Right to Access (Art. 15 GDPR):</strong> You can request a copy of your personal data</li>
                  <li><strong>Right to Rectification (Art. 16 GDPR):</strong> You can request correction of inaccurate data</li>
                  <li><strong>Right to Erasure (Art. 17 GDPR):</strong> You can request deletion of your data</li>
                  <li><strong>Right to Restriction (Art. 18 GDPR):</strong> You can request limitation of data processing</li>
                  <li><strong>Right to Data Portability (Art. 20 GDPR):</strong> You can receive your data in a structured format</li>
                  <li><strong>Right to Object (Art. 21 GDPR):</strong> You can object to data processing</li>
                  <li><strong>Right to Withdraw Consent (Art. 7(3) GDPR):</strong> You can withdraw consent at any time</li>
                </ul>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">How to Exercise Your Rights</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  To exercise any of these rights, please email us at <a href="mailto:likhodievskihleb@gmail.com" className="text-purple-600 hover:underline font-bold">likhodievskihleb@gmail.com</a>:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li><strong>To access your data:</strong> Send us an email with "Access My Data" in the subject line.</li>
                  <li><strong>To withdraw cookie consent:</strong> Simply change your preferences in our cookie banner or clear your browser cookies.</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  We will respond to your request within 30 days as required by GDPR.
                </p>
              </div>

              {/* Section 9 - Cookie Policy */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">9. Cookie Policy</h2>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">9.1 What Are Cookies</h3>
                <p className="text-gray-600 leading-relaxed">
                  Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience and analyze website usage.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">9.2 Types of Cookies We Use</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-bold text-gray-900 mb-2">Necessary Cookies</h4>
                    <p className="text-gray-600 text-sm">
                      Essential for the website to function. These include cookies for theme preferences and cookie consent settings. These cookies cannot be disabled.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-bold text-gray-900 mb-2">Analytics Cookies (Optional - Google Analytics)</h4>
                    <p className="text-gray-600 text-sm">
                      Help us understand how visitors use our website, which pages are most popular, and how users navigate the site. This data is anonymized and aggregated. You can opt out at any time through our cookie banner.
                    </p>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">9.3 Managing Cookies</h3>
                <p className="text-gray-600 leading-relaxed">
                  You can manage your cookie preferences at any time through our cookie settings in the footer. You can also configure your browser to refuse all cookies or alert you when a cookie is being sent.
                </p>
              </div>

              {/* Sections 10-15 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">10. Data Security</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>SSL/TLS encryption for data transmission</li>
                  <li>Secure hosting infrastructure</li>
                  <li>Regular security updates and monitoring</li>
                  <li>Access controls and authentication</li>
                </ul>
              </div>

              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">11. International Data Transfers</h2>
                <p className="text-gray-600 leading-relaxed">
                  Your data is primarily processed within the European Economic Area (EEA). If we transfer data outside the EEA, we ensure appropriate safeguards are in place, such as EU Standard Contractual Clauses or adequacy decisions.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">12. Children's Privacy</h2>
                <p className="text-gray-600 leading-relaxed">
                  Our website is not intended for children under 16 years of age. We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us immediately.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">13. Changes to This Policy</h2>
                <p className="text-gray-600 leading-relaxed">
                  We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page indicates when the policy was last revised. We encourage you to review this policy periodically.
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">14. Right to Lodge a Complaint</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you believe we have not handled your personal data in accordance with the GDPR, you have the right to lodge a complaint with a supervisory authority. In Germany, you can contact:
                </p>
                <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-xl">
                  <p className="font-bold text-gray-900">Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI)</p>
                  <p className="text-gray-700 mt-2">Graurheindorfer Str. 153</p>
                  <p className="text-gray-700">53117 Bonn, Germany</p>
                  <p className="text-gray-700 mt-2">
                    Website: <a href="https://www.bfdi.bund.de" className="text-purple-600 hover:underline">www.bfdi.bund.de</a>
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">15. Contact Us</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-xl">
                  <p className="text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <a href="mailto:likhodievskihleb@gmail.com" className="text-purple-600 hover:underline font-bold">
                      likhodievskihleb@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}