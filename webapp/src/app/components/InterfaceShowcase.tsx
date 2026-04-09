import { motion } from 'motion/react';
import interfaceImage from 'figma:asset/f3b91916d93f326a243763a8af5c407de320b32b.png';

export function InterfaceShowcase() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-white via-pink-50/10 to-white overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-40 left-20 w-96 h-96 bg-gradient-to-br from-pink-400 to-fuchsia-500 rounded-full opacity-10 blur-3xl" />
      <div className="absolute bottom-40 right-20 w-96 h-96 bg-gradient-to-tr from-purple-400 to-indigo-500 rounded-full opacity-10 blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
            <span className="text-sm text-white font-bold uppercase tracking-wider">INTERFACE</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Professional <span className="bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Interface</span>
          </h2>
          <p className="text-xl text-content-faint max-w-2xl mx-auto font-medium">
            Designed for speed and precision
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Interface Screenshot with elegant shadow */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 border-2 border-gray-100 bg-white">
            <img 
              src={interfaceImage} 
              alt="Professional Interface"
              className="w-full h-auto"
            />
            
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Floating feature cards */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute -left-6 top-1/4 hidden lg:block"
          >
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-purple-500/10 border border-gray-100 max-w-xs">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-sm text-content-faint">Generate professional content in seconds</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="absolute -right-6 bottom-1/4 hidden lg:block"
          >
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-purple-500/10 border border-gray-100 max-w-xs">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Precision Control</h3>
              <p className="text-sm text-content-faint">Fine-tune every detail with advanced options</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-8 mt-20"
        >
          {[
            {
              icon: "⚡",
              title: "Intuitive Controls",
              description: "Streamlined interface designed for efficiency"
            },
            {
              icon: "🎨",
              title: "Visual Workflow",
              description: "See your creations come to life in real-time"
            },
            {
              icon: "🚀",
              title: "Pro-Grade Tools",
              description: "Professional features at your fingertips"
            }
          ].map((feature, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-content-faint">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
