import { motion } from 'motion/react';
import { Target, Image, Video, Zap, Lock, Layers } from 'lucide-react';

export function Testimonials() {
  const highlights = [
    {
      icon: Target,
      title: "Reference-Driven Consistency",
      description: "Lock your subject + add up to 14 style references. Get consistent results across variations — not random outputs.",
      gradient: "from-fuchsia-500 to-pink-500"
    },
    {
      icon: Layers,
      title: "Strategy Before Execution",
      description: "CONCEPT tab generates briefs, prompt packs, and shotlists. Plan first, then send prompts directly to IMAGE/VIDEO tabs.",
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      icon: Image,
      title: "Production-Grade Output",
      description: "Clean, campaign-ready images and videos. 4K resolution, 10 aspect ratios, professional lighting and composition.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Video,
      title: "Advanced Video Modes",
      description: "Text→Video, Image→Video, Interpolation, and Extension. Create 8s clips, extend up to 20 times (Veo native).",
      gradient: "from-red-500 to-pink-500"
    },
    {
      icon: Lock,
      title: "Privacy-First Architecture",
      description: "Your API key stays in your browser. We never see, store, or train on your content. True local-first workflow.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Multi-Model Future",
      description: "Powered by Google Gemini + Veo today. Flux, Sora, and more engines on the roadmap — you'll choose what fits.",
      gradient: "from-orange-500 to-amber-500"
    }
  ];

  return (
    <section className="relative py-32 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
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
            <span className="text-sm text-white font-bold uppercase tracking-wider">Beta · Built For Production</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Built for real work
            <br />
            <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
              not random outputs
            </span>
          </h2>
          <p className="text-xl text-content-faint max-w-2xl mx-auto font-medium">
            fullydigital.pictures is focused on control, consistency, and speed — designed for ad production from day one.
          </p>
        </motion.div>

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
                <div className="relative h-full p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-transparent hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                  
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} p-3 mb-4 shadow-md`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-content-faint text-sm leading-relaxed">
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
            { value: "PRIVACY", label: "FIRST" }
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
