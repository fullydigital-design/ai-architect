import { motion } from 'motion/react';
import { ArrowLeft, FileText, Mail } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';

interface ImpressumPageProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function ImpressumPage({ onNavigate, currentPage }: ImpressumPageProps) {
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
              <span className="text-sm text-white font-bold">Legal Notice</span>
            </div>
            <h1 className="text-6xl font-black text-gray-900 mb-6">
              Impressum <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">(Legal Disclosure)</span>
            </h1>
            <p className="text-xl text-gray-600 font-medium">
              Information according to § 5 TMG (German Telemedia Act)
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
          >
            <div className="space-y-12">
              {/* Responsible Party */}
              <div className="bg-purple-50 border-l-4 border-purple-600 p-8 rounded-r-xl">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Responsible for Content</h2>
                <div className="space-y-3 text-gray-700">
                  <p className="font-bold text-lg text-gray-900">Hleb Likhodievski</p>
                  <p>Marienthaler Straße 35</p>
                  <p>20535 Hamburg</p>
                  <p>Germany</p>
                  <p className="flex items-center gap-2 mt-4">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <a href="mailto:likhodievskihleb@gmail.com" className="text-purple-600 hover:underline font-bold">
                      likhodievskihleb@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Non-Commercial Notice */}
              <div className="bg-amber-50 border-l-4 border-amber-500 p-8 rounded-r-xl">
                <h2 className="text-2xl font-black text-gray-900 mb-4">Non-Commercial Prototype</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  This website is a <strong>non-commercial demonstration prototype</strong> created for portfolio and testing purposes only. 
                  No goods or services are sold through this website, and no commercial activities are conducted.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  All features, workflows, and AI integrations displayed are for <strong>demonstration and educational purposes only</strong>. 
                  This prototype is not intended for production use or commercial exploitation.
                </p>
              </div>

              {/* Disclaimer */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Disclaimer</h2>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">Liability for Content</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  The contents of this website have been created with the greatest possible care. However, we cannot guarantee the 
                  accuracy, completeness, or timeliness of the content. As a service provider, we are responsible for our own content 
                  on these pages in accordance with § 7 para.1 TMG (German Telemedia Act) and general laws. According to §§ 8 to 10 TMG, 
                  however, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances 
                  that indicate illegal activity.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">Liability for Links</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Our website contains links to external third-party websites, over whose contents we have no control. Therefore, 
                  we cannot accept any liability for these external contents. The respective provider or operator of the pages is 
                  always responsible for the contents of the linked pages. The linked pages were checked for possible legal violations 
                  at the time of linking. Illegal contents were not recognizable at the time of linking.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">Copyright</h3>
                <p className="text-gray-600 leading-relaxed">
                  The content and works created by the site operator on these pages are subject to German copyright law. 
                  The reproduction, editing, distribution, and any kind of use outside the limits of copyright law require 
                  the written consent of the respective author or creator. Downloads and copies of this site are only permitted 
                  for private, non-commercial use. Insofar as the content on this site was not created by the operator, 
                  the copyrights of third parties are respected.
                </p>
              </div>

              {/* Data Protection Officer */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Privacy & Data Protection</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  For information about how we handle your personal data, please refer to our{' '}
                  <button
                    onClick={() => onNavigate('privacy')}
                    className="text-purple-600 hover:underline font-bold"
                  >
                    Privacy Policy
                  </button>.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  For questions regarding data protection, you can contact us at:{' '}
                  <a href="mailto:likhodievskihleb@gmail.com" className="text-purple-600 hover:underline font-bold">
                    likhodievskihleb@gmail.com
                  </a>
                </p>
              </div>

              {/* EU Dispute Resolution */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">EU Dispute Resolution</h2>
                <p className="text-gray-600 leading-relaxed">
                  The European Commission provides a platform for online dispute resolution (ODR):{' '}
                  <a 
                    href="https://ec.europa.eu/consumers/odr" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr
                  </a>
                  . Since this is a non-commercial website, we are not obligated to participate in dispute resolution 
                  proceedings before a consumer arbitration board, nor are we willing to do so.
                </p>
              </div>

              {/* Contact */}
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-4">Contact</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  If you have any questions about this website, its content, or legal matters, please contact:
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
            </div>
          </motion.div>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}