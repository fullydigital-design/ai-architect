import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function Hero({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-purple-50/30 to-pink-50/40">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/4 -left-1/4 w-[1000px] h-[1000px] rounded-full bg-gradient-to-br from-fuchsia-400 via-purple-500 to-pink-500 opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/3 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-tl from-cyan-400 via-blue-500 to-indigo-500 opacity-15 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-orange-400 via-rose-500 to-pink-500 opacity-15 blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            x: [0, 100, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/30 mb-8"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-sm text-white font-semibold">Alpha Prototype · Testing Phase</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-7xl md:text-9xl font-black mb-6 tracking-tight leading-none"
        >
          <span className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Create ads
          </span>
          <br />
          <span className="text-gray-900">in seconds</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-content-faint mb-12 max-w-3xl mx-auto font-medium"
        >
          fullydigital.pictures is a lightweight AI creative suite for advertising.
          <span className="text-transparent bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text font-bold"> Plan campaigns, generate images and videos, and iterate fast</span> — 
          with consistency, speed, and clean controls. From brainstorming to export-ready assets, powered by advanced prompting + references.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button 
            size="lg"
            onClick={onGetStarted}
            className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 text-lg px-10 py-7 rounded-2xl shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 transition-all font-bold"
          >
            Start Prototype (Alpha)
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>

        {/* Trust Line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-sm text-content-muted mt-6"
        >
          No credit card • Runs in your browser • Alpha testing phase
        </motion.p>

        {/* Tech Trust Line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-xs text-content-secondary mt-4 max-w-2xl mx-auto"
        >
          Powered by <span className="font-bold text-content-faint">official Google Gemini API</span> (Imagen 3 + Veo). 
          Your API key, your data — we never see your content. Privacy-first architecture.
        </motion.p>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}