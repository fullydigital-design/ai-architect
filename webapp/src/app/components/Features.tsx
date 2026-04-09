import { motion } from 'motion/react';
import { Image, Video, Wand2, Sparkles, Zap, Workflow, Lightbulb, Edit3 } from 'lucide-react';

const features = [
  {
    icon: Lightbulb,
    title: "Strategic Planning",
    description: "Brainstorm in the CONCEPT tab. Get campaign briefs, prompt packs, shotlists, and ad copy — then send them directly to image or video generation.",
    gradient: "from-purple-500 via-indigo-500 to-violet-500"
  },
  {
    icon: Image,
    title: "Image Generation",
    description: "Campaign-ready visuals from a prompt. Clean lighting, strong composition, and high-quality output. Up to 14 style references for consistency.",
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500"
  },
  {
    icon: Video,
    title: "Video Generation",
    description: "Short-form motion for ads. Generate quick variations for social formats and creative testing. Text→Video, Image→Video, interpolation, and extension modes.",
    gradient: "from-purple-500 via-violet-500 to-indigo-500"
  },
  {
    icon: Wand2,
    title: "Subject & Style References",
    description: "Keep identity and look consistent. Lock the subject (1 image) and match the finishing across a set (up to 14 style refs for images, 3 for video).",
    gradient: "from-blue-500 via-cyan-500 to-teal-500"
  },
  {
    icon: Edit3,
    title: "Image Editing & Masks",
    description: "Edit mode with mask painting. Modify specific areas, regenerate selections, or refine details while keeping the rest intact.",
    gradient: "from-green-500 via-emerald-500 to-teal-500"
  },
  {
    icon: Sparkles,
    title: "Upscale & Enhance",
    description: "Polish the final output. Sharper details, cleaner textures, better realism — in one click. 1K, 2K, 4K resolution options.",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500"
  },
  {
    icon: Zap,
    title: "Variations & Control",
    description: "Generate 1-4 variations at once. Use seed for repeatability, negative prompts for exclusions, and precise controls for predictable results.",
    gradient: "from-pink-500 via-rose-500 to-red-500"
  },
  {
    icon: Workflow,
    title: "Workflow-First UI",
    description: "Built for speed and production. A clean interface that keeps you moving — not tuning settings all day. Gallery, filters, and quick iteration.",
    gradient: "from-orange-500 via-amber-500 to-yellow-500"
  }
];

export function Features() {
  return (
    <section id="features" className="relative py-32 bg-gradient-to-b from-white via-purple-50/20 to-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-fuchsia-400 to-purple-500 rounded-full opacity-10 blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-full opacity-10 blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
            <span className="text-sm text-white font-bold uppercase tracking-wider">Features</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Everything you need — nothing you don't
          </h2>
          <p className="text-xl text-content-faint max-w-2xl mx-auto font-medium">
            A focused set of tools built for creative output and fast iteration.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                {/* Card with gradient border */}
                <div className="relative h-full p-8 rounded-3xl bg-white border-2 border-gray-100 overflow-hidden hover:border-transparent hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
                  {/* Gradient border on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-300`} />
                  <div className="absolute inset-[2px] bg-white rounded-3xl -z-10" />
                  
                  {/* Icon */}
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 mb-6 shadow-xl shadow-purple-500/20`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-black text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-content-faint leading-relaxed font-medium">
                    {feature.description}
                  </p>

                  {/* Decorative corner */}
                  <div className={`absolute top-6 right-6 w-3 h-3 rounded-full bg-gradient-to-br ${feature.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
