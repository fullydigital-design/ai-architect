import { motion } from 'motion/react';
import { Upload, Sparkles, Settings, Download, Edit3, RotateCcw, Save, ImageIcon } from 'lucide-react';

export function DemoInterface() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-white via-gray-50/30 to-white overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:80px_80px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
            <span className="text-sm text-white font-bold uppercase tracking-wider">Interface</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Professional <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Interface</span>
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
          {/* Main Interface Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-200 overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-black">WB</span>
                </div>
                <span className="text-gray-900 font-bold text-lg">fullydigital.pictures</span>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-content-faint hover:bg-gray-100 transition-colors flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  TEXT
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-content-faint hover:bg-gray-100 transition-colors flex items-center gap-2">
                  💡 CONCEPT
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  IMAGE
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-content-faint hover:bg-gray-100 transition-colors">
                  VIDEO
                </button>
              </div>

              {/* Right buttons */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg border border-gray-200 text-content-faint hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <button className="px-4 py-2 rounded-lg border border-gray-200 text-content-faint hover:bg-gray-50 transition-colors text-sm font-semibold flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-[280px_1fr] min-h-[600px]">
              {/* Left Sidebar - Controls */}
              <div className="bg-gray-50/50 border-r border-gray-200 p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">CONTROLS</h3>
                  <button className="text-content-secondary hover:text-content-faint">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Mode Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-content-faint uppercase tracking-wider">MODE</label>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 px-4 rounded-lg bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </button>
                    <button className="flex-1 py-2.5 px-4 rounded-lg bg-white border border-gray-200 text-content-faint text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                </div>

                {/* Subject Image Upload */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-content-faint uppercase tracking-wider">SUBJECT IMAGE (OPTIONAL)</label>
                  <div className="aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                    <Upload className="w-6 h-6 text-content-secondary group-hover:text-blue-500 transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-content-faint">Upload Subject</p>
                      <p className="text-xs text-content-muted">Optional Reference</p>
                    </div>
                  </div>
                </div>

                {/* Style Images */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-content-faint uppercase tracking-wider">STYLE IMAGES (UP TO 7)</label>
                  <div className="aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                    <Upload className="w-6 h-6 text-content-secondary group-hover:text-blue-500 transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-content-faint">Add Style</p>
                      <p className="text-xs text-content-muted">0 / 7</p>
                    </div>
                  </div>
                </div>

                {/* Scene Description */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-content-faint uppercase tracking-wider">SCENE DESCRIPTION</label>
                  <textarea
                    placeholder="e.g., 'A futuristic cityscape at sunset...'"
                    className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* Generate Button */}
                <button className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  GENERATE IMAGE
                </button>

                {/* Bottom Actions */}
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 text-content-faint text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button className="flex-1 py-2.5 px-4 rounded-lg border border-gray-200 text-content-faint text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Main Canvas Area */}
              <div className="relative bg-white p-8 lg:p-12 flex items-center justify-center">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                  {/* Large Icon */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex"
                  >
                    <div className="w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                      <ImageIcon className="w-16 h-16 text-white" strokeWidth={2} />
                    </div>
                  </motion.div>

                  {/* Heading */}
                  <div>
                    <h3 className="text-3xl lg:text-4xl font-black text-blue-500 mb-3">
                      Professional Image Generation
                    </h3>
                    <p className="text-lg text-content-faint font-medium">
                      Create stunning visuals from text descriptions
                    </p>
                  </div>

                  {/* Feature Pills */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <span className="px-4 py-2 rounded-full bg-orange-50 text-orange-600 text-sm font-semibold border border-orange-200">
                      📦 Product Shots
                    </span>
                    <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold border border-blue-200">
                      🏞️ Landscapes
                    </span>
                    <span className="px-4 py-2 rounded-full bg-purple-50 text-purple-600 text-sm font-semibold border border-purple-200">
                      👤 Portraits
                    </span>
                    <span className="px-4 py-2 rounded-full bg-pink-50 text-pink-600 text-sm font-semibold border border-pink-200">
                      🎨 Abstract Art
                    </span>
                  </div>

                  {/* 3 Step Cards */}
                  <div className="grid md:grid-cols-3 gap-4 pt-6">
                    {[
                      { icon: Edit3, step: 'STEP 1', title: 'Write Prompt', desc: 'Describe the image you want to create' },
                      { icon: Sparkles, step: 'STEP 2', title: 'AI Generates', desc: 'Advanced AI creates your visual' },
                      { icon: Download, step: 'STEP 3', title: 'Download', desc: 'Save your professional image' }
                    ].map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                          className="bg-white rounded-2xl border-2 border-gray-100 p-6 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                            <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                          </div>
                          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">{item.step}</p>
                          <h4 className="text-base font-bold text-gray-900 mb-2">{item.title}</h4>
                          <p className="text-sm text-content-faint">{item.desc}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Floating Settings Button */}
                <button className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-2xl shadow-blue-500/40 hover:scale-110 transition-all flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Subtle glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
