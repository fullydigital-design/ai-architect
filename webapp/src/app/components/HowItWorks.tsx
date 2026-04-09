import { motion } from 'motion/react';
import { Lightbulb, Image, Video, ArrowRight } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Lightbulb,
      title: "Brainstorm (CONCEPT)",
      description: "Use AI to generate campaign briefs, prompt packs, shotlists, or describe existing images. Refine your strategy before execution.",
      gradient: "from-purple-500 to-indigo-500",
      features: ["8 goal types", "Multi-language support", "Send prompts to IMAGE/VIDEO"]
    },
    {
      number: "02",
      icon: Image,
      title: "Generate Images",
      description: "Lock subject identity (1 image) + style (up to 14 references). Create 1-4 variations with control over resolution and aspect ratio.",
      gradient: "from-blue-500 to-cyan-500",
      features: ["1K/2K/4K resolution", "10 aspect ratios", "Edit mode with masks"]
    },
    {
      number: "03",
      icon: Video,
      title: "Create Videos",
      description: "Text→Video, Image→Video, Interpolation, or Extend modes. Up to 3 reference images for consistency. 4s, 6s, or 8s duration.",
      gradient: "from-red-500 to-pink-500",
      features: ["720p/1080p/4K", "Multiple modes", "Extension support"]
    },
    {
      number: "04",
      icon: ArrowRight,
      title: "Iterate & Export",
      description: "Review in gallery, refine with filters, extend videos up to 20 times, and download finals in the formats you need.",
      gradient: "from-fuchsia-500 to-purple-500",
      features: ["Smart gallery", "Type filters", "Quick download"]
    }
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
            <span className="text-sm text-white font-bold uppercase tracking-wider">Workflow</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            From strategy to assets — in minutes
          </h2>
          <p className="text-xl text-content-faint max-w-2xl mx-auto font-medium">
            A complete workflow that goes beyond just generation — plan, create, refine, export.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative group"
              >
                <div className="relative h-full p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-transparent hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  {/* Step number */}
                  <div className={`absolute -top-3 -left-3 w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-black text-sm">{step.number}</span>
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.gradient} p-3 mb-4 mt-4`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-black text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-content-faint text-sm leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Features */}
                  <div className="space-y-1.5">
                    {step.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${step.gradient}`} />
                        <span className="text-xs text-content-muted font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow connector (except last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
                    <ArrowRight className="w-6 h-6 text-purple-300" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16"
        >
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all">
            Try the workflow now
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
