import { motion } from 'motion/react';
import { ArrowLeft, FileText, Mail } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';

interface TermsPageProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function TermsPage({ onNavigate, currentPage }: TermsPageProps) {
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
              <FileText className="w-5 h-5 text-white" />
              <span className="text-sm text-white font-bold">Legal Agreement</span>
            </div>
            <h1 className="text-6xl font-black text-gray-900 mb-6">
              Terms of <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Service</span>
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
                <p className="text-gray-600 leading-relaxed mb-4">
                  Welcome to fullydigital.pictures, a demonstration prototype website by Hleb Likhodievski. These Terms of Service ("Terms") govern your access to and use of our website. By accessing or using our website, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our website.
                </p>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl">
                  <p className="text-gray-700 font-bold mb-2">⚠️ Non-Commercial Prototype</p>
                  <p className="text-gray-700 leading-relaxed">
                    This website is a <strong>non-commercial demonstration prototype</strong> created for portfolio and testing purposes only. 
                    No goods or services are sold through this website. All features are for demonstration purposes only.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">2. Acceptance of Terms</h2>
                <p className="text-gray-600 leading-relaxed">
                  By accessing this website, you accept these Terms in full. If you disagree with these Terms or any part of these Terms, you must not use our website. These Terms are governed by German law and comply with EU regulations.
                </p>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">3. Intellectual Property Rights</h2>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">3.1 Ownership</h3>
                <p className="text-gray-600 leading-relaxed">
                  All content on this website, including but not limited to text, graphics, images, videos, logos, designs, and software, is the exclusive property of Hleb Likhodievski or its licensors and is protected by German and international copyright, trademark, and other intellectual property laws.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">3.2 License to View</h3>
                <p className="text-gray-600 leading-relaxed">
                  You are granted a limited, non-exclusive, non-transferable license to access and view the content on this website for personal, non-commercial purposes only.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">3.3 Restrictions</h3>
                <p className="text-gray-600 leading-relaxed mb-3">You must not:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>Reproduce, duplicate, copy, or resell any content from this website</li>
                  <li>Modify, adapt, or create derivative works based on the content</li>
                  <li>Use the content for commercial purposes without prior written consent</li>
                  <li>Remove or alter any copyright, trademark, or other proprietary notices</li>
                  <li>Download or store content except as incidentally necessary for viewing</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">4. Acceptable Use</h2>
                <p className="text-gray-600 leading-relaxed mb-3">You agree not to use this website:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>In any way that violates any applicable local, national, or international law or regulation</li>
                  <li>To transmit or send unsolicited or unauthorized advertising or promotional material</li>
                  <li>To impersonate or attempt to impersonate Hleb Likhodievski or any other person or entity</li>
                  <li>To engage in any conduct that restricts or inhibits anyone's use or enjoyment of the website</li>
                  <li>To introduce viruses, trojans, worms, logic bombs, or other malicious or harmful material</li>
                  <li>To attempt to gain unauthorized access to the website or any related systems</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">5. Portfolio Content</h2>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">5.1 Display of Work</h3>
                <p className="text-gray-600 leading-relaxed">
                  The portfolio projects and images displayed on this website are examples of work created by Hleb Likhodievski. All rights to these works remain with Hleb Likhodievski and/or the respective clients or commissioners.
                </p>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 mt-6">5.2 Client Work</h3>
                <p className="text-gray-600 leading-relaxed">
                  Some portfolio pieces may have been created for clients. While displayed here for portfolio purposes, the intellectual property rights may be owned by the respective clients. Any unauthorized use of such work may constitute infringement of third-party rights.
                </p>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">6. Links to Other Websites</h2>
                <p className="text-gray-600 leading-relaxed">
                  Our website may contain links to third-party websites that are not owned or controlled by Hleb Likhodievski. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites. You acknowledge and agree that we shall not be responsible or liable for any damage or loss caused by your use of any such websites.
                </p>
              </div>

              {/* Section 7 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">7. Disclaimer of Warranties</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  This website is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied, regarding:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>The operation or availability of the website</li>
                  <li>The accuracy, completeness, or currency of any content</li>
                  <li>The fitness for a particular purpose</li>
                  <li>The absence of errors, viruses, or other harmful components</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  To the fullest extent permitted by applicable law, we disclaim all warranties, express or implied.
                </p>
              </div>

              {/* Section 8 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">8. Limitation of Liability</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  To the maximum extent permitted by German law, Hleb Likhodievski shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>Your access to or use of (or inability to access or use) the website</li>
                  <li>Any conduct or content of any third party on the website</li>
                  <li>Any content obtained from the website</li>
                  <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mt-3">
                  This limitation applies even if we have been advised of the possibility of such damages. Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential or incidental damages, so the above limitations may not apply to you.
                </p>
              </div>

              {/* Section 9 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">9. Indemnification</h2>
                <p className="text-gray-600 leading-relaxed mb-3">
                  You agree to indemnify, defend, and hold harmless Hleb Likhodievski from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including attorney's fees) arising from:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                  <li>Your use of the website</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any third-party rights, including intellectual property rights</li>
                  <li>Any harmful or illegal conduct by you</li>
                </ul>
              </div>

              {/* Section 10 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">10. Data Protection and Privacy</h2>
                <p className="text-gray-600 leading-relaxed">
                  Your use of this website is also governed by our Privacy Policy, which complies with the EU General Data Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG). Please review our Privacy Policy to understand how we collect, use, and protect your personal data.
                </p>
              </div>

              {/* Section 11 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">11. No User Data Collection</h2>
                <p className="text-gray-600 leading-relaxed">
                  This prototype website does not collect user data through contact forms or user accounts. All workflow demonstrations operate client-side in your browser. For information about analytics data, please see our Privacy Policy.
                </p>
              </div>

              {/* Section 12 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">12. Modifications to Terms</h2>
                <p className="text-gray-600 leading-relaxed">
                  We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  By continuing to access or use our website after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you must stop using the website.
                </p>
              </div>

              {/* Section 13 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">13. Severability</h2>
                <p className="text-gray-600 leading-relaxed">
                  If any provision of these Terms is held to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not in any way be affected or impaired, and such provision shall be reformed only to the extent necessary to make it enforceable.
                </p>
              </div>

              {/* Section 14 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">14. Entire Agreement</h2>
                <p className="text-gray-600 leading-relaxed">
                  These Terms, together with our Privacy Policy, constitute the entire agreement between you and Hleb Likhodievski regarding the use of this website and supersede all prior and contemporaneous understandings, agreements, representations, and warranties.
                </p>
              </div>

              {/* Section 15 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">15. Governing Law and Jurisdiction</h2>
                <p className="text-gray-600 leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Germany, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in Germany, and you hereby irrevocably consent to personal jurisdiction and venue therein.
                </p>
              </div>

              {/* Section 16 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">16. Contact Information</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-xl">
                  <p className="font-bold text-gray-900">Hleb Likhodievski</p>
                  <p className="text-gray-700 flex items-center gap-2 mt-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <a href="mailto:likhodievskihleb@gmail.com" className="text-purple-600 hover:underline font-bold">
                      likhodievskihleb@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Section 17 */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">17. Acknowledgment</h2>
                <p className="text-gray-600 leading-relaxed">
                  By using this website, you acknowledge that you have read these Terms of Service and agree to be bound by them.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}