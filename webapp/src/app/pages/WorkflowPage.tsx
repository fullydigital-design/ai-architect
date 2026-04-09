import { motion } from 'motion/react';
import { Sparkles, Zap, Layers, Maximize2, Video } from 'lucide-react';
import { HowItWorks } from '@/app/components/HowItWorks';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';
import { tokens } from '@/styles/tokens';

export function WorkflowPage({ onNavigate, currentPage }: { onNavigate?: (page: string) => void; currentPage?: string }) {
  const statCards = [
    {
      icon: Zap,
      value: "10x",
      label: "Faster",
      sublabel: "vs manual workflow",
      gradient: tokens.gradients.warning
    },
    {
      icon: Layers,
      value: "14",
      label: "Style Refs",
      sublabel: "Max consistency",
      gradient: tokens.gradients.purple
    },
    {
      icon: Maximize2,
      value: "4K",
      label: "Resolution",
      sublabel: "Up to 4096px",
      gradient: tokens.gradients.secondary
    },
    {
      icon: Video,
      value: "4",
      label: "Video Modes",
      sublabel: "Full control",
      gradient: tokens.gradients.danger
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navigation onGetStarted={() => onNavigate?.('workflow-selection')} onNavigate={onNavigate} currentPage={currentPage} />
      <DisclaimerBanner />

      <div className="pt-[125px]">
        {/* Hero */}
        <section className="relative py-32 overflow-hidden bg-gradient-to-b from-white via-purple-50/20 to-white">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-bold uppercase tracking-wider">WORKFLOW</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl md:text-7xl font-black text-gray-900 mb-6"
            >
              Streamlined <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Creative Process</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-12 font-medium"
            >
              From concept to campaign in minutes. Our AI-powered workflow adapts to your creative needs.
            </motion.p>
          </div>
        </section>

        <HowItWorks />

        {/* Automated Pipeline with Interactive Stats */}
        <section className="relative py-32 bg-gradient-to-b from-white via-pink-50/10 to-white">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Column - Text Content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                  Automated <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Pipeline</span>
                </h2>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed font-medium">
                  Our intelligent automation handles repetitive tasks, so you can focus on creativity. Build templates, set parameters, and let AI do the heavy lifting.
                </p>
                <ul className="space-y-4">
                  {[
                    "Batch processing for multiple assets",
                    "Template-based campaigns",
                    "Brand consistency automation",
                    "Real-time collaboration tools",
                    "Version control & rollback",
                    "API integration for custom workflows"
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center gap-3 text-gray-700 font-medium"
                    >
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Right Column - Interactive Stat Cards Grid */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-2 gap-4"
              >
                {statCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="group relative"
                    >
                      <div className={`relative p-6 ${tokens.radius.large} bg-white border-2 border-gray-200 hover:border-transparent ${tokens.shadows.card} hover:${tokens.shadows.cardHover} ${tokens.transitions.default} flex flex-col items-center justify-center text-center h-full min-h-[180px]`}>
                        {/* Gradient hover effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 ${tokens.radius.large} ${tokens.transitions.default}`} />
                        
                        {/* Icon */}
                        <div className={`w-12 h-12 ${tokens.radius.small} bg-gradient-to-br ${card.gradient} p-2.5 mb-3 shadow-lg group-hover:scale-110 ${tokens.transitions.default} relative z-10`}>
                          <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                        </div>

                        {/* Value */}
                        <div className={`text-4xl md:text-5xl font-black bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent mb-2 relative z-10`}>
                          {card.value}
                        </div>

                        {/* Label */}
                        <div className="text-base font-black text-gray-900 mb-1 relative z-10">
                          {card.label}
                        </div>

                        {/* Sublabel */}
                        <div className="text-xs text-gray-500 font-medium relative z-10">
                          {card.sublabel}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}