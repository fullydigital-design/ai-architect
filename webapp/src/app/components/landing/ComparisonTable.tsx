import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { tokens } from '@/styles/tokens';
import { SectionHeader } from '@/app/components/shared/SectionHeader';
import { GradientText } from '@/app/components/shared/GradientText';

export function ComparisonTable() {
  const features = [
    { name: 'Strategy/Planning Tab', waybetter: true, midjourney: false, runway: false },
    { name: 'Your Own API Key', waybetter: true, midjourney: false, runway: false },
    { name: 'Image Generation', waybetter: true, midjourney: true, runway: true },
    { name: 'Video Generation', waybetter: true, midjourney: false, runway: true },
    { name: 'Up to 14 Style References', waybetter: true, midjourney: false, runway: false },
    { name: 'Subject Reference Image', waybetter: true, midjourney: false, runway: true },
    { name: 'Video Extension (20x)', waybetter: true, midjourney: false, runway: false },
    { name: 'Image Editing/Masking', waybetter: true, midjourney: true, runway: true },
    { name: 'Prompt Pack Generation', waybetter: true, midjourney: false, runway: false },
    { name: 'Control Your Costs', waybetter: true, midjourney: false, runway: false },
    { name: 'No Vendor Lock-In', waybetter: true, midjourney: false, runway: false },
    { name: '4K Resolution', waybetter: true, midjourney: true, runway: true },
  ];

  return (
    <section className="relative py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          badge="Comparison"
          title={<>How fullydigital.pictures <GradientText>compares</GradientText></>}
          subtitle="See what makes fullydigital.pictures different from other AI creative tools"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="overflow-x-auto"
        >
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-6 text-sm font-bold text-content-faint uppercase tracking-wider">
                  Feature
                </th>
                <th className="text-center py-4 px-6">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-black text-sm">FD</span>
                    </div>
                    <span className="text-sm font-black text-gray-900">fullydigital.pictures</span>
                  </div>
                </th>
                <th className="text-center py-4 px-6">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                      <span className="text-content-faint font-black text-xs">MJ</span>
                    </div>
                    <span className="text-sm font-bold text-content-faint">Midjourney</span>
                  </div>
                </th>
                <th className="text-center py-4 px-6">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                      <span className="text-content-faint font-black text-xs">RW</span>
                    </div>
                    <span className="text-sm font-bold text-content-faint">Runway</span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {features.map((feature, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors"
                >
                  <td className="py-4 px-6 text-sm font-medium text-content-faint">
                    {feature.name}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {feature.waybetter ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                        <X className="w-5 h-5 text-content-secondary" strokeWidth={3} />
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {feature.midjourney ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-300">
                        <Check className="w-5 h-5 text-content-faint" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                        <X className="w-5 h-5 text-content-secondary" strokeWidth={3} />
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {feature.runway ? (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-300">
                        <Check className="w-5 h-5 text-content-faint" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                        <X className="w-5 h-5 text-content-secondary" strokeWidth={3} />
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-purple-200"
        >
          <p className="text-sm text-content-faint leading-relaxed">
            <strong className="text-purple-900">Why this matters:</strong> fullydigital.pictures combines strategy, image, and video in one workflow. 
            You use your own Google API key, so you control costs and never get locked into a vendor. 
            Perfect for agencies and in-house teams who need production control.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
