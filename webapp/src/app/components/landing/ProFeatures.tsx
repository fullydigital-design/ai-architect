import { Sparkles, Zap, Target, Infinity } from 'lucide-react';

export function ProFeatures() {
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">New: PRO Workflow Builder</span>
          </div>
          <h2 className="text-5xl font-black text-gray-900 mb-4">
            When Simple Isn't Enough Anymore
          </h2>
          <p className="text-xl text-content-faint max-w-3xl mx-auto font-medium">
            Build complex AI pipelines with visual node connections. No code required.
            Chain models together. Automate your entire process.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Simple Mode */}
          <div className="bg-white rounded-3xl p-8 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">SIMPLE Mode</h3>
                <p className="text-sm text-content-muted font-medium">Click & Generate</p>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-content-faint font-medium">3 tabs (CONCEPT, IMAGE, VIDEO)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-content-faint font-medium">One-at-a-time generation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-content-faint font-medium">Perfect for quick single outputs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-content-faint font-medium">5-minute learning curve</span>
              </li>
            </ul>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-bold text-gray-900 mb-2">Best For:</p>
              <p className="text-sm text-content-faint font-medium">Quick tasks, testing ideas, single outputs</p>
            </div>
          </div>

          {/* PRO Mode */}
          <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 rounded-3xl p-8 border-2 border-purple-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">PRO Mode</h3>
                  <p className="text-sm text-purple-100 font-medium">Build & Automate</p>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span className="text-white font-medium">Visual node canvas (drag & drop)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span className="text-white font-medium">Chain unlimited steps together</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span className="text-white font-medium">Save & reuse custom workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-1">✓</span>
                  <span className="text-white font-medium">Batch process multiple outputs</span>
                </li>
              </ul>
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-sm font-bold text-white mb-2">Best For:</p>
                <p className="text-sm text-purple-100 font-medium">Complex workflows, automation, production pipelines</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Node Graph Example */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 mb-2">No Code. Just Connections.</h3>
            <p className="text-content-faint font-medium">If you can draw arrows, you can build AI workflows</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl p-8 overflow-x-auto">
            {/* Beautiful Visual Nodes */}
            <div className="flex items-center justify-center gap-4 min-w-max px-4">
              {/* API Key Node */}
              <div className="relative">
                <div className="bg-white rounded-xl shadow-lg p-4 w-44 border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="text-xs font-black text-gray-900">API Key</div>
                  </div>
                  <div className="text-xs text-content-faint font-medium">Setup</div>
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-black" style={{ fontSize: '8px' }}>SETUP</div>
                </div>
                {/* Connection line */}
                <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-gradient-to-r from-purple-400 to-purple-500"></div>
                <div className="absolute top-1/2 -right-2 w-2 h-2 border-2 border-purple-400 bg-purple-400 rounded-full transform -translate-y-1/2"></div>
              </div>

              {/* Gemini Node */}
              <div className="relative">
                <div className="bg-white rounded-xl shadow-lg p-4 w-44 border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="text-xs font-black text-gray-900">CONCEPT</div>
                  </div>
                  <div className="text-xs text-content-faint font-medium">Gemini</div>
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-black" style={{ fontSize: '8px' }}>GOOGLE</div>
                </div>
                <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-gradient-to-r from-purple-400 to-pink-500"></div>
                <div className="absolute top-1/2 -right-2 w-2 h-2 border-2 border-pink-400 bg-pink-400 rounded-full transform -translate-y-1/2"></div>
              </div>

              {/* Image Node */}
              <div className="relative">
                <div className="bg-white rounded-xl shadow-lg p-4 w-44 border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-xs font-black text-gray-900">IMAGE</div>
                  </div>
                  <div className="text-xs text-content-faint font-medium">Imagen 3</div>
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 text-white text-xs font-black" style={{ fontSize: '8px' }}>GOOGLE</div>
                </div>
                <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-gradient-to-r from-pink-400 to-blue-500"></div>
                <div className="absolute top-1/2 -right-2 w-2 h-2 border-2 border-blue-400 bg-blue-400 rounded-full transform -translate-y-1/2"></div>
              </div>

              {/* Video Node */}
              <div className="relative">
                <div className="bg-white rounded-xl shadow-lg p-4 w-44 border-2 border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-xs font-black text-gray-900">VIDEO</div>
                  </div>
                  <div className="text-xs text-content-faint font-medium">Veo 3.1</div>
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-black" style={{ fontSize: '8px' }}>GOOGLE</div>
                </div>
              </div>
            </div>

            {/* Result text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-purple-200 font-medium">
                Result: Generate campaign concept → Create visual → Animate it → All automated
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-content-faint font-medium mb-4">
                Inspired by tools like <strong>Figma</strong>, <strong>Blender Nodes</strong>, and <strong>Unreal Blueprints</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <div className="text-3xl mb-3">🏢</div>
            <h4 className="text-lg font-black text-gray-900 mb-2">Agency Automation</h4>
            <p className="text-sm text-content-faint font-medium mb-4">
              Sarah generates 75 client posts every Monday in 20 minutes. One workflow replaces 8 hours of clicking.
            </p>
            <div className="text-xs text-purple-600 font-bold">
              ROI: 24x faster → 6 hours saved/week
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <div className="text-3xl mb-3">🛍️</div>
            <h4 className="text-lg font-black text-gray-900 mb-2">E-commerce Pipeline</h4>
            <p className="text-sm text-content-faint font-medium mb-4">
              Mike launches 50+ products monthly. Each gets: SEO description + 5 photos + promo video automatically.
            </p>
            <div className="text-xs text-purple-600 font-bold">
              Result: Complete product set in 3 minutes
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <div className="text-3xl mb-3">🌍</div>
            <h4 className="text-lg font-black text-gray-900 mb-2">Multi-Language Campaigns</h4>
            <p className="text-sm text-content-faint font-medium mb-4">
              One prompt automatically generates social posts in English, Spanish, and French with matching visuals.
            </p>
            <div className="text-xs text-purple-600 font-bold">
              Output: 3 languages × 3 platforms = 9 posts
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="bg-white rounded-2xl p-8 border-2 border-purple-200">
          <h3 className="text-xl font-black text-gray-900 mb-6 text-center">Everything from Simple Mode, Plus:</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="px-4 py-2 rounded-full bg-purple-100 border border-purple-300">
              <span className="text-sm font-bold text-purple-900">🔗 Multi-step Automation</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-purple-100 border border-purple-300">
              <span className="text-sm font-bold text-purple-900">💾 Reusable Templates</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-purple-100 border border-purple-300">
              <span className="text-sm font-bold text-purple-900">⚡ Batch Processing</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-purple-100 border border-purple-300">
              <span className="text-sm font-bold text-purple-900">🎯 Custom Pipelines</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-purple-100 border border-purple-300">
              <span className="text-sm font-bold text-purple-900">🔄 Mix & Match Models</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-purple-100 border border-purple-300">
              <span className="text-sm font-bold text-purple-900">🚀 Future-Proof (Flux, Kling coming)</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <a
              href="#workflow-selection"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 text-white font-black text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all"
            >
              Try PRO Workflow Builder →
            </a>
            <a
              href="#docs"
              className="px-8 py-4 rounded-xl bg-white border-2 border-gray-300 text-gray-900 font-black text-lg hover:border-purple-400 transition-all"
            >
              Read Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}