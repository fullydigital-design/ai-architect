import { motion } from 'motion/react';
import { Lightbulb, Image, Video, Download, ArrowRight } from 'lucide-react';
import { tokens } from '@/styles/tokens';

export function WorkflowDiagram() {
  const steps = [
    {
      icon: Lightbulb,
      title: 'CONCEPT',
      subtitle: 'Strategy First',
      description: 'Generate briefs, prompts, hooks, and shotlists',
      gradient: tokens.gradients.purple,
      delay: 0,
    },
    {
      icon: Image,
      title: 'IMAGE',
      subtitle: 'Visual Creation',
      description: 'Generate & edit with 14 style references',
      gradient: tokens.gradients.secondary,
      delay: 0.2,
    },
    {
      icon: Video,
      title: 'VIDEO',
      subtitle: 'Motion Content',
      description: 'Create & extend videos up to 20x',
      gradient: tokens.gradients.danger,
      delay: 0.4,
    },
    {
      icon: Download,
      title: 'EXPORT',
      subtitle: 'Campaign Ready',
      description: 'Download in all formats and resolutions',
      gradient: tokens.gradients.success,
      delay: 0.6,
    },
  ];

  return (
    <div className="relative py-20">
      {/* Connection Lines (Desktop) */}
      <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2">
        <motion.div
          className={`h-full bg-gradient-to-r ${tokens.gradients.primary} opacity-20`}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.3 }}
          style={{ transformOrigin: 'left' }}
        />
      </div>

      {/* Steps */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: step.delay }}
              className="relative group"
            >
              {/* Card */}
              <div className={`relative p-6 ${tokens.radius.medium} ${tokens.backgrounds.card} ${tokens.borders.card} hover:${tokens.borders.cardHover} ${tokens.transitions.default} text-center h-full flex flex-col items-center`}>
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0 group-hover:opacity-5 ${tokens.radius.medium} ${tokens.transitions.default}`} />

                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-black flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>

                {/* Icon */}
                <motion.div
                  className={`w-20 h-20 ${tokens.radius.medium} bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 mt-4 shadow-xl relative z-10`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <Icon className="w-10 h-10 text-white" strokeWidth={2.5} />
                </motion.div>

                {/* Content */}
                <h3 className={`${tokens.typography.h5} ${tokens.colors.text.primary} mb-2 relative z-10`}>
                  {step.title}
                </h3>
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-3 relative z-10">
                  {step.subtitle}
                </p>
                <p className="text-sm text-content-faint leading-relaxed relative z-10">
                  {step.description}
                </p>
              </div>

              {/* Arrow (Desktop only, except last) */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: step.delay + 0.3 }}
                  className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 z-20"
                >
                  <ArrowRight className="w-8 h-8 text-purple-400" strokeWidth={3} />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}