import { motion } from 'motion/react';

export function TrustedBy() {
  const useCases = [
    "🎯 Product Photography",
    "🎬 Social Ads (Reels/Shorts/Stories)",
    "🚗 Automotive Campaigns",
    "📱 App Store Creatives",
    "🏢 Real Estate Marketing",
    "👕 Fashion Lookbooks",
    "🎨 Concept Art",
    "📊 A/B Testing Sets"
  ];

  return (
    <section className="relative py-20 bg-gradient-to-b from-white to-purple-50/30 border-y border-purple-100">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-content-muted text-sm uppercase tracking-wider mb-8 font-bold">
            Built for creators, agencies, and in-house teams
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group"
              >
                <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-default">
                  <span className="text-sm font-bold text-content-faint group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-fuchsia-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all">
                    {useCase}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-content-secondary text-sm mt-8 max-w-2xl mx-auto">
            Designed for modern ad workflows — concept → image → video → export.
          </p>
        </motion.div>
      </div>
    </section>
  );
}