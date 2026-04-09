import { motion } from 'motion/react';
import { Target, Layers, Zap, Lock, Lightbulb, Settings } from 'lucide-react';
import { tokens } from '@/styles/tokens';
import { SectionHeader } from '@/app/components/shared/SectionHeader';
import { GradientText } from '@/app/components/shared/GradientText';

export function WhyWayBetter() {
  const highlights = [
    {
      icon: Lightbulb,
      title: "Strategy Before Execution",
      description: "CONCEPT tab generates briefs, prompt packs, and shotlists. Plan first, then send prompts directly to IMAGE/VIDEO tabs.",
      gradient: tokens.gradients.purple
    },
    {
      icon: Target,
      title: "Reference-Driven Consistency",
      description: "Lock your subject + add up to 14 style references. Get consistent results across variations—not random outputs.",
      gradient: tokens.gradients.fuchsia
    },
    {
      icon: Zap,
      title: "Production Controls",
      description: "Real tools pros need: negative prompts, seed control, mask editing, video interpolation, 20× extension support.",
      gradient: tokens.gradients.secondary
    },
    {
      icon: Layers,
      title: "Multi-Format Export",
      description: "Generate for Reels (9:16), Stories, Feed (1:1), YouTube (16:9). One concept, every platform.",
      gradient: tokens.gradients.warning
    },
    {
      icon: Lock,
      title: "No Vendor Lock-In",
      description: "Your own Google API key. No markup, no subscriptions. Multi-model support coming—you choose the engine.",
      gradient: tokens.gradients.success
    },
    {
      icon: Settings,
      title: "Advanced Video Modes",
      description: "Text→Video, Image→Video, Interpolation, and Extension. Create 8s clips, extend up to 20 times.",
      gradient: tokens.gradients.danger
    }
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <SectionHeader
          badge="Why WayBetter"
          title={
            <>
              Built for real work,{' '}
              <GradientText>not random outputs</GradientText>
            </>
          }
          subtitle="WayBetter combines strategy, control, and consistency—designed for ad production from day one."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group"
              >
                <div className={`relative h-full p-6 ${tokens.radius.medium} bg-white ${tokens.borders.card} hover:border-transparent ${tokens.shadows.card} hover:${tokens.shadows.cardHover} ${tokens.transitions.default}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 ${tokens.radius.medium} ${tokens.transitions.default}`} />
                  
                  <div className={`w-12 h-12 ${tokens.radius.small} bg-gradient-to-br ${item.gradient} p-3 mb-4 shadow-md relative z-10`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  <h3 className={`${tokens.typography.h5} ${tokens.colors.text.primary} mb-3 relative z-10`}>
                    {item.title}
                  </h3>
                  <p className={`${tokens.colors.text.muted} text-sm leading-relaxed relative z-10`}>
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Technical Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
        >
          {[
            { value: "UP TO 14", label: "STYLE REFS" },
            { value: "4K", label: "RESOLUTION" },
            { value: "8 GOAL", label: "TYPES" },
            { value: "4 MODES", label: "VIDEO GEN" }
          ].map((stat, index) => (
            <div key={index} className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100">
              <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-xs text-content-faint uppercase tracking-wider font-bold">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
