import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function CTA({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 opacity-20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-pink-400 to-orange-500 opacity-20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-xl shadow-purple-500/30 mb-8">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm text-white font-bold">Alpha Prototype</span>
          </div>

          {/* Heading */}
          <h2 className="text-5xl md:text-8xl font-black text-gray-900 mb-6 leading-tight">
            Ready to Build
            <br />
            <span className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Better Ads?
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-content-faint mb-12 max-w-3xl mx-auto font-medium">
            Start creating campaign-ready content with AI — CONCEPT, IMAGE, and VIDEO in one workflow
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 transition-all font-bold"
              onClick={onGetStarted}
            >
              Alpha prototype
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-purple-600/30 text-purple-700 hover:bg-white hover:border-purple-600/50 text-lg px-12 py-7 rounded-2xl backdrop-blur-sm bg-white/80 font-bold"
            >
              View Docs
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 items-center text-sm text-content-faint">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
              <span className="font-bold">No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
              <span className="font-bold">Free during beta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
              <span className="font-bold">Your API key</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}