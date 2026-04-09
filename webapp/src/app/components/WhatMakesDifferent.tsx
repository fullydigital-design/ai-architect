import { motion } from 'motion/react';
import { Lightbulb, Unlock, Settings } from 'lucide-react';

export function WhatMakesDifferent() {
  const differences = [
    {
      icon: Lightbulb,
      title: "Strategy + Execution",
      description: "Most tools just generate. fullydigital.pictures helps you plan first (CONCEPT), then execute with control (references, variations, seeds).",
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      icon: Unlock,
      title: "No Vendor Lock-In",
      description: "Uses official Google APIs with your key. Multi-model support coming — you choose the engine, not us.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Settings,
      title: "Production Controls",
      description: "Real tools pros need: negative prompts, seed control, mask editing, video interpolation, 20× extension support.",
      gradient: "from-fuchsia-500 to-pink-500"
    }
  ];

  return (
    <section className="relative py-32 bg-white overflow-hidden">
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
            <span className="text-sm text-white font-bold uppercase tracking-wider">Why fullydigital.pictures</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Built different
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {differences.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative group"
              >
                <div className="relative h-full p-8 rounded-3xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-transparent hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity duration-300`} />
                  
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} p-4 mb-6 shadow-lg shadow-purple-500/20`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-content-faint leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
