import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Book, ChevronDown, ChevronUp, Sparkles, Image, Video, 
  Key, Shield, Lightbulb, Zap, Settings, Grid3x3, Layers,
  Film, Target, FileText, Copy, Palette, Camera, Lock,
  Maximize2, Sliders, Hash, RefreshCw, Download, Eye,
  Play, Pause, FastForward, GitBranch, Info, CheckCircle2,
  AlertCircle, HelpCircle, Boxes, Smartphone, Globe, X, TrendingDown
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';
import { ProWorkflowDocs } from '@/app/components/docs/ProWorkflowDocs';

interface ExpandableSectionProps {
  title: string;
  icon: any;
  gradient: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExpandableSection({ title, icon: Icon, gradient, children, defaultOpen = false }: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-2 border-gray-200 rounded-2xl bg-white hover:border-purple-200 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
            <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-400 group-hover:text-purple-600 transition-colors" />
        )}
      </button>
      
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 pb-6"
        >
          <div className="pl-16 pr-4">
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function DocsPage({ onNavigate, currentPage }: { onNavigate?: (page: string) => void; currentPage?: string }) {
  const [activeTab, setActiveTab] = useState<'start' | 'concept' | 'image' | 'video' | 'workflows' | 'tips' | 'pro'>('start');

  const tabs = [
    { id: 'start', label: 'Getting Started', icon: Sparkles },
    { id: 'pro', label: 'PRO Workflow Builder', icon: Target },
    { id: 'concept', label: 'CONCEPT Tab', icon: Lightbulb },
    { id: 'image', label: 'IMAGE Tab', icon: Image },
    { id: 'video', label: 'VIDEO Tab', icon: Video },
    { id: 'workflows', label: 'Workflows', icon: GitBranch },
    { id: 'tips', label: 'Tips & Help', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navigation onGetStarted={() => onNavigate?.('workflow-selection')} onNavigate={onNavigate} currentPage={currentPage} />
      <DisclaimerBanner />

      <div className="pt-[125px]">
        {/* Hero */}
        <section className="relative py-32 overflow-hidden bg-gradient-to-b from-white via-purple-50/20 to-white">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6"
            >
              <Book className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-bold uppercase tracking-wider">Documentation</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl md:text-7xl font-black text-gray-900 mb-6"
            >
              Everything you
              <br />
              <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
                need to know
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-12 font-medium"
            >
              Complete guide to fullydigital.pictures — from API setup to advanced workflows
            </motion.p>
          </div>
        </section>

        {/* Quick Start Card */}
        <section className="relative -mt-16 z-10">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-3xl p-8 md:p-12 shadow-2xl shadow-purple-500/40"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Quick Start — 3 Steps
                </h2>
                <p className="text-purple-100 text-lg font-medium">
                  Get up and running in under 5 minutes
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/20">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-black text-white">1</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Get API Key</h3>
                  <p className="text-purple-100 text-sm leading-relaxed">
                    Visit Google AI Studio, create a free account, and generate your Gemini API key
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/20">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-black text-white">2</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Enter Key</h3>
                  <p className="text-purple-100 text-sm leading-relaxed">
                    Click Settings in fullydigital.pictures, paste your API key. It's stored locally in your browser only
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/20">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-black text-white">3</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Start Creating</h3>
                  <p className="text-purple-100 text-sm leading-relaxed">
                    Use CONCEPT for strategy, IMAGE for visuals, VIDEO for motion — all in one workflow
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Button
                  onClick={() => onNavigate?.('studio')}
                  className="bg-white text-purple-600 hover:bg-purple-50 border-0 px-10 py-6 rounded-2xl font-black text-lg shadow-xl"
                >
                  Try It Now
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="relative py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2.5} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto">
              {activeTab === 'pro' && (
                <ProWorkflowDocs />
              )}
              
              {activeTab === 'start' && (
                <div className="space-y-6">
                  <ExpandableSection
                    title="What is fullydigital.pictures?"
                    icon={Info}
                    gradient="from-blue-500 to-cyan-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed font-medium">
                        fullydigital.pictures is a <strong>web-based AI creative suite</strong> designed specifically for advertising content creation. It combines strategic planning, visual generation, and video production into one unified workflow.
                      </p>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-blue-900 mb-2">Key Features:</p>
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• <strong>CONCEPT Tab:</strong> Strategic planning and brainstorming (8 goal types)</li>
                          <li>• <strong>IMAGE Tab:</strong> Generate & edit campaign-ready images with Nano Banana</li>
                          <li>• <strong>VIDEO Tab:</strong> Create professional videos with Veo 3.1</li>
                          <li>• <strong>No installation:</strong> Runs entirely in your browser (desktop & mobile)</li>
                          <li>• <strong>Privacy-first:</strong> Your API key and data stay local</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Google API Key Setup"
                    icon={Key}
                    gradient="from-green-500 to-emerald-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-6 text-gray-700">
                      <div>
                        <h4 className="text-lg font-black text-gray-900 mb-3">What You Need</h4>
                        <p className="leading-relaxed font-medium mb-4">
                          fullydigital.pictures uses the <strong>official Google Gemini API</strong> to power all AI features. You need your own API key from Google.
                        </p>
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <p className="text-sm font-bold text-green-900 mb-2">Why bring your own key?</p>
                          <ul className="space-y-1 text-sm text-green-800">
                            <li>• <strong>Privacy:</strong> Your data never goes through fullydigital.pictures servers</li>
                            <li>• <strong>Cost control:</strong> You pay Google directly (no markup)</li>
                            <li>• <strong>Transparency:</strong> See exactly what you're spending</li>
                            <li>• <strong>No vendor lock-in:</strong> You own the relationship with Google</li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-gray-900 mb-3">How to Get Your API Key</h4>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                            <div>
                              <p className="font-bold text-gray-900">Visit Google AI Studio</p>
                              <p className="text-sm text-gray-600">Go to <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">aistudio.google.com</code></p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                            <div>
                              <p className="font-bold text-gray-900">Sign in with Google Account</p>
                              <p className="text-sm text-gray-600">Use any Google account (Gmail, Workspace, etc.)</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                            <div>
                              <p className="font-bold text-gray-900">Create API Key</p>
                              <p className="text-sm text-gray-600">Click "Get API Key" button in the interface</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                            <div>
                              <p className="font-bold text-gray-900">Copy the Key</p>
                              <p className="text-sm text-gray-600">It looks like: <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">AIzaSy...</code></p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">5</div>
                            <div>
                              <p className="font-bold text-gray-900">Paste in fullydigital.pictures Settings</p>
                              <p className="text-sm text-gray-600">Click the Settings icon in fullydigital.pictures's top-right corner</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Important Notes:
                        </p>
                        <ul className="space-y-1 text-sm text-yellow-800">
                          <li>• Google provides free tier usage, then pay-as-you-go pricing</li>
                          <li>• Typical cost: €5–20 for 100 campaign assets</li>
                          <li>• You can set spending limits in Google Cloud Console</li>
                          <li>• API key is free to create, you only pay for what you generate</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="APIs Used by fullydigital.pictures"
                    icon={Boxes}
                    gradient="from-purple-500 to-indigo-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed font-medium mb-4">
                        Your single Google Gemini API key unlocks access to multiple Google AI models:
                      </p>
                      <div className="space-y-3">
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                          <p className="font-black text-purple-900 mb-2">Gemini (Text Generation)</p>
                          <p className="text-sm text-purple-800">Used by CONCEPT tab for strategy, briefs, prompts, hooks, copy, and descriptions</p>
                          <p className="text-xs text-purple-600 mt-2">Cost: ~€0.001 per generation</p>
                        </div>
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          <p className="font-black text-blue-900 mb-2">Imagen 3 / Nano Banana (Image Generation)</p>
                          <p className="text-sm text-blue-800">Used by IMAGE tab for generating and editing campaign-ready visuals up to 4K resolution</p>
                          <p className="text-xs text-blue-600 mt-2">Cost: ~€0.02–0.10 per image</p>
                        </div>
                        <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
                          <p className="font-black text-pink-900 mb-2">Veo 3.1 (Video Generation)</p>
                          <p className="text-sm text-pink-800">Used by VIDEO tab for creating professional videos up to 4K with multiple generation modes</p>
                          <p className="text-xs text-pink-600 mt-2">Cost: ~€0.10–0.50 per video</p>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Privacy & Data Storage"
                    icon={Shield}
                    gradient="from-red-500 to-pink-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                        <h4 className="text-lg font-black text-green-900 mb-4 flex items-center gap-2">
                          <Lock className="w-5 h-5" />
                          Privacy-First Architecture
                        </h4>
                        <div className="space-y-3 text-sm text-green-800">
                          <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Your API key is stored locally</p>
                              <p className="text-green-700">Saved in your browser's localStorage, never sent to fullydigital.pictures servers</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Direct Google API calls</p>
                              <p className="text-green-700">All generation requests go directly from your browser to Google</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">No content storage</p>
                              <p className="text-green-700">fullydigital.pictures never sees, stores, or trains on your generated content</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">You can delete anytime</p>
                              <p className="text-green-700">Clear your API key from Settings or browser storage whenever you want</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Browser & Device Support"
                    icon={Smartphone}
                    gradient="from-orange-500 to-amber-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed font-medium">
                        fullydigital.pictures is a <strong>progressive web app</strong> optimized for both desktop and mobile:
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                          <p className="font-black text-blue-900 mb-2">Desktop Browsers</p>
                          <ul className="space-y-1 text-sm text-blue-800">
                            <li>• Chrome / Edge (Recommended)</li>
                            <li>• Safari (macOS)</li>
                            <li>• Firefox</li>
                            <li>• All modern browsers with ES2020+ support</li>
                          </ul>
                        </div>
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                          <p className="font-black text-purple-900 mb-2">Mobile Devices</p>
                          <ul className="space-y-1 text-sm text-purple-800">
                            <li>• iOS Safari (iPhone/iPad)</li>
                            <li>• Android Chrome</li>
                            <li>• Responsive design adapts to screen size</li>
                            <li>• Touch-optimized controls</li>
                          </ul>
                        </div>
                      </div>
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-yellow-900 mb-2">Note:</p>
                        <p className="text-sm text-yellow-800">No installation or deployment needed — just open the URL and start using it!</p>
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {activeTab === 'concept' && (
                <div className="space-y-6">
                  <ExpandableSection
                    title="CONCEPT Tab Overview"
                    icon={Lightbulb}
                    gradient="from-purple-500 to-indigo-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed font-medium">
                        The CONCEPT tab helps you <strong>plan before you create</strong>. Use it to generate campaign strategies, creative briefs, prompt variations, hooks, copy, and more — all before touching IMAGE or VIDEO tabs.
                      </p>
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-purple-900 mb-2">Why start with CONCEPT?</p>
                        <ul className="space-y-1 text-sm text-purple-800">
                          <li>• Get structured, strategic outputs instead of random generation</li>
                          <li>• Send prompts directly to IMAGE or VIDEO tabs with one click</li>
                          <li>• Reverse-engineer competitor content</li>
                          <li>• Generate multiple creative directions fast</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="8 Goal Types Explained"
                    icon={Target}
                    gradient="from-fuchsia-500 to-pink-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-6 text-gray-700">
                      <div className="space-y-4">
                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">1. Campaign Concept</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Generate a complete campaign strategy including target audience, key messages, visual direction, tone, and execution ideas.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Starting a new campaign from scratch, pitching ideas to clients, exploring creative directions</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">2. Creative Brief</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Create a structured creative brief with objectives, deliverables, brand guidelines, and execution notes — perfect for teams and agencies.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Formalizing requirements, aligning teams, documenting project scope</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">3. Prompt Pack</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Generate 5–10 prompt variations for IMAGE or VIDEO generation. Each prompt is optimized for visual AI models with detailed descriptions.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Quick A/B testing, exploring multiple visual directions, batch generation workflows</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">4. Hooks</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Create attention-grabbing hooks, headlines, and opening lines for ads, social posts, videos, and landing pages.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Social ads, video scripts, email subject lines, landing page headlines</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">5. Product Copy</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Generate sales-focused copy for product descriptions, ad text, CTAs, and value propositions.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">E-commerce listings, Facebook/Google ads, landing pages, email campaigns</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">6. Reverse-Engineer Image</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Upload a competitor's ad or reference image, and get a detailed description of composition, lighting, style, colors, and mood — perfect for recreating similar visuals.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Analyzing competitor ads, matching visual style, creating "inspired by" content</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">7. Style Description</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Describe a visual style in detail (art direction, lighting, colors, composition) to use as a reference for IMAGE generation.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Creating brand style guides, consistent visual identity, mood board documentation</p>
                          </div>
                        </div>

                        <div className="border-2 border-gray-200 rounded-xl p-5">
                          <h4 className="text-lg font-black text-gray-900 mb-2">8. Shotlist</h4>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">
                            Generate a frame-by-frame shotlist for video ads with scene descriptions, camera angles, transitions, and timing.
                          </p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                            <p className="text-xs text-gray-600">Video planning, storyboarding, social video ads (Reels, Stories, TikTok)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="CONCEPT Controls"
                    icon={Settings}
                    gradient="from-blue-500 to-cyan-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-black text-gray-900 mb-2">Model Selection</h4>
                          <p className="text-sm text-gray-700 mb-3">Choose between Gemini Flash (faster, cheaper) or Gemini Pro (higher quality, more creative).</p>
                          <div className="grid md:grid-cols-2 gap-3">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="font-bold text-green-900 text-sm mb-1">Gemini Flash</p>
                              <p className="text-xs text-green-700">Fast, cost-effective, great for quick iterations</p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                              <p className="font-bold text-purple-900 text-sm mb-1">Gemini Pro</p>
                              <p className="text-xs text-purple-700">More creative, nuanced, better for complex briefs</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-gray-900 mb-2">Tone Controls</h4>
                          <p className="text-sm text-gray-700 mb-3">Select the tone/voice for generated content:</p>
                          <div className="flex flex-wrap gap-2">
                            {['Professional', 'Casual', 'Bold', 'Playful', 'Luxury', 'Technical', 'Friendly', 'Authoritative'].map(tone => (
                              <span key={tone} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">{tone}</span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-gray-900 mb-2">Web Search Toggle</h4>
                          <p className="text-sm text-gray-700 mb-2">Ground your concepts in real-time data from the web (optional).</p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-blue-900 mb-1">When to use Web Search:</p>
                            <p className="text-xs text-blue-700">Product launches, trending topics, competitor research, data-driven campaigns</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-gray-900 mb-2">Send to IMAGE/VIDEO</h4>
                          <p className="text-sm text-gray-700">Click the arrow icon next to any generated prompt to send it directly to IMAGE or VIDEO tab — no copy/paste needed.</p>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-6">
                  <ExpandableSection
                    title="IMAGE Tab Overview"
                    icon={Image}
                    gradient="from-blue-500 to-cyan-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed font-medium">
                        The IMAGE tab generates and edits <strong>campaign-ready images</strong> up to 4K resolution using Google's Nano Banana and Imagen 3 models.
                      </p>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-blue-900 mb-2">Key Capabilities:</p>
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• Generate: Create new images from text prompts</li>
                          <li>• Edit: Modify existing images with mask-based editing</li>
                          <li>• Subject Reference: Lock your product/person for consistency</li>
                          <li>• Style References: Add up to 14 images for visual consistency</li>
                          <li>• Resolution: 1K, 2K, or 4K output</li>
                          <li>• 10 aspect ratios for all ad formats</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Generation Modes"
                    icon={Zap}
                    gradient="from-purple-500 to-fuchsia-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="border-2 border-gray-200 rounded-xl p-5">
                        <h4 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          Generate Mode
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Create brand new images from text descriptions. Use prompts, references, and style images to control output.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                          <p className="text-xs text-gray-600">Product photography, lifestyle shots, concept art, social media visuals</p>
                        </div>
                      </div>

                      <div className="border-2 border-gray-200 rounded-xl p-5">
                        <h4 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Palette className="w-5 h-5" />
                          Edit Mode
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Upload an image, draw a mask over areas to change, and describe what you want. The AI will intelligently modify only the masked areas.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                          <p className="text-xs text-gray-600">Background changes, object removal, product variations, color adjustments</p>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Core Controls"
                    icon={Settings}
                    gradient="from-green-500 to-emerald-500"
                  >
                    <div className="space-y-5 text-gray-700">
                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Prompt Input
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">Describe what you want to see. Be specific about composition, lighting, style, and details.</p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-900 mb-1">Example:</p>
                          <p className="text-xs text-green-700 font-mono">"Premium wireless headphones on marble surface, soft natural lighting from left, minimalist composition, product photography style, white background"</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Subject Reference Image
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">Upload ONE image of your product, person, or object to maintain consistency across all generations.</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-1">How it works:</p>
                          <p className="text-xs text-blue-700">The AI will keep the subject's appearance identical but change background, lighting, pose, or context based on your prompt</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Style References (up to 14)
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">Upload multiple images to guide the overall visual style, mood, color palette, and artistic direction.</p>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-purple-900 mb-1">Pro tip:</p>
                          <p className="text-xs text-purple-700">Use 3–5 style references with similar aesthetics for best consistency. Mix photography, art, and mood boards.</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Web Search Toggle
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">Ground your image generation in real-world visual data (optional).</p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-yellow-900 mb-1">When to use:</p>
                          <p className="text-xs text-yellow-700">Current trends, real locations, accurate representations of existing products/places</p>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Output Settings"
                    icon={Maximize2}
                    gradient="from-orange-500 to-amber-500"
                  >
                    <div className="space-y-5 text-gray-700">
                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Model Selection</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="font-bold text-blue-900 text-sm mb-1">Nano Banana</p>
                            <p className="text-xs text-blue-700">Google's latest model with enhanced quality and faster generation</p>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="font-bold text-purple-900 text-sm mb-1">Imagen 3</p>
                            <p className="text-xs text-purple-700">Premium quality, photorealistic results, higher cost</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Resolution</h4>
                        <p className="text-sm text-gray-700 mb-3">Choose output quality based on your needs:</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">1K (1024px)</p>
                              <p className="text-xs text-gray-600">Fast preview, social media</p>
                            </div>
                            <span className="text-xs font-bold text-green-600">€0.02</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">2K (2048px)</p>
                              <p className="text-xs text-gray-600">Balanced quality/speed</p>
                            </div>
                            <span className="text-xs font-bold text-yellow-600">€0.05</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">4K (4096px)</p>
                              <p className="text-xs text-gray-600">Print-ready, large displays</p>
                            </div>
                            <span className="text-xs font-bold text-red-600">€0.10</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-3">Aspect Ratios (10 options)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            { ratio: '1:1', name: 'Square', use: 'Instagram feed' },
                            { ratio: '2:3', name: 'Portrait', use: 'Pinterest' },
                            { ratio: '3:2', name: 'Landscape', use: 'Blog headers' },
                            { ratio: '3:4', name: 'Tall', use: 'Stories prep' },
                            { ratio: '4:3', name: 'Classic', use: 'Presentations' },
                            { ratio: '9:16', name: 'Vertical', use: 'Stories/Reels' },
                            { ratio: '16:9', name: 'Wide', use: 'YouTube/TV' },
                            { ratio: '21:9', name: 'Ultra Wide', use: 'Banners' },
                          ].map(ar => (
                            <div key={ar.ratio} className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-2">
                              <p className="font-black text-purple-900 text-xs">{ar.ratio}</p>
                              <p className="text-[10px] text-purple-700">{ar.name}</p>
                              <p className="text-[9px] text-purple-600">{ar.use}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Advanced Controls"
                    icon={Sliders}
                    gradient="from-red-500 to-pink-500"
                  >
                    <div className="space-y-5 text-gray-700">
                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <X className="w-4 h-4" />
                          Negative Prompt
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">Specify what you DON'T want in the image. Helps avoid unwanted elements, styles, or compositions.</p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-900 mb-1">Example:</p>
                          <p className="text-xs text-red-700 font-mono">"blurry, distorted, low quality, watermark, text, people, cluttered background"</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Seed (Reproducibility)
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">A number that controls randomness. Same seed + same prompt = same image (mostly). Use to iterate on a specific result.</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-1">Workflow:</p>
                          <p className="text-xs text-blue-700">Generate image → Note the seed → Adjust prompt → Use same seed → Get similar composition with changes</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          Number of Variations (1–4)
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">Generate multiple versions from the same prompt in one click. Perfect for A/B testing and exploring options.</p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-900 mb-1">Pro tip:</p>
                          <p className="text-xs text-green-700">Start with 4 variations to explore range, then refine with seeds</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Subject Mode Toggle
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">When enabled, the AI prioritizes keeping the subject reference image's appearance exact. Disable for more creative freedom.</p>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Best Practices"
                    icon={CheckCircle2}
                    gradient="from-yellow-500 to-orange-500"
                  >
                    <div className="space-y-3 text-gray-700">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <h4 className="font-black text-yellow-900 mb-2">For Consistent Product Photography:</h4>
                        <ul className="space-y-1 text-sm text-yellow-800">
                          <li>• Upload your product as Subject Reference</li>
                          <li>• Use 3–5 style references with similar lighting/backgrounds</li>
                          <li>• Keep prompts focused on background/lighting changes</li>
                          <li>• Use negative prompts to avoid distortion</li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-black text-blue-900 mb-2">For Quality Control:</h4>
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• Always use negative prompts: "blurry, distorted, low quality"</li>
                          <li>• Start with 2K resolution for speed, finalize at 4K</li>
                          <li>• Generate 4 variations, pick best, refine with seed</li>
                          <li>• Reference images dramatically improve quality</li>
                        </ul>
                      </div>

                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                        <h4 className="font-black text-purple-900 mb-2">For A/B Testing:</h4>
                        <ul className="space-y-1 text-sm text-purple-800">
                          <li>• Lock Subject Reference, vary backgrounds/styles</li>
                          <li>• Use same seed, change one element in prompt</li>
                          <li>• Generate multiple aspect ratios for same concept</li>
                          <li>• Save successful seeds for future campaigns</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {activeTab === 'video' && (
                <div className="space-y-6">
                  <ExpandableSection
                    title="VIDEO Tab Overview"
                    icon={Video}
                    gradient="from-red-500 to-pink-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="leading-relaxed font-medium">
                        The VIDEO tab creates <strong>professional-quality videos</strong> up to 4K resolution using Google's Veo 3.1 model — designed specifically for advertising and social content.
                      </p>
                      <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-pink-900 mb-2">Key Capabilities:</p>
                        <ul className="space-y-1 text-sm text-pink-800">
                          <li>• 4 generation modes: Text→Video, Image→Video, Interpolation, Extension</li>
                          <li>• Durations: 4s, 6s, or 8s per generation</li>
                          <li>• Resolutions: 720p, 1080p, 4K</li>
                          <li>• Aspect ratios: 16:9 (landscape) or 9:16 (portrait)</li>
                          <li>• Extend videos up to 20 times (Veo native support)</li>
                          <li>• Reference images for style/subject consistency</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="4 Generation Modes"
                    icon={Film}
                    gradient="from-purple-500 to-fuchsia-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="border-2 border-gray-200 rounded-xl p-5">
                        <h4 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Play className="w-5 h-5" />
                          Text→Video
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Generate videos from text descriptions only. The AI creates everything: motion, composition, lighting, camera movement.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                          <p className="text-xs text-gray-600">Abstract concepts, full creative freedom, quick ideation, exploring motion styles</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-1">Example prompt:</p>
                          <p className="text-xs text-blue-700 font-mono">"Slow zoom into luxury watch on marble surface, golden hour lighting, cinematic product reveal, 4K quality"</p>
                        </div>
                      </div>

                      <div className="border-2 border-gray-200 rounded-xl p-5">
                        <h4 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                          <Camera className="w-5 h-5" />
                          Image→Video
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Upload a starting image and describe the motion. The AI animates your image with camera movement, object motion, or environmental effects.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                          <p className="text-xs text-gray-600">Animating product photos, adding life to static designs, parallax effects, subtle motion</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-purple-900 mb-1">Example:</p>
                          <p className="text-xs text-purple-700">Upload product photo → Prompt: "Slow 360° rotation, soft focus pull, product stays centered"</p>
                        </div>
                      </div>

                      <div className="border-2 border-gray-200 rounded-xl p-5">
                        <h4 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                          <GitBranch className="w-5 h-5" />
                          Interpolation
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Upload TWO images (start and end frames), and the AI creates smooth motion between them — perfect for transitions and transformations.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                          <p className="text-xs text-gray-600">Before/after reveals, product transformations, seamless transitions, morphing effects</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-900 mb-1">Pro tip:</p>
                          <p className="text-xs text-green-700">Works best when start and end images have similar composition/framing</p>
                        </div>
                      </div>

                      <div className="border-2 border-gray-200 rounded-xl p-5">
                        <h4 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                          <FastForward className="w-5 h-5" />
                          Extend Video
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          Upload an existing video and continue it forward in time. Veo natively supports extending up to 20 times — create 8s clips, then extend to 40s+ total.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-bold text-gray-600 mb-1">Best for:</p>
                          <p className="text-xs text-gray-600">Longer narratives, multi-scene ads, storytelling, consistent motion continuation</p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-yellow-900 mb-1">Workflow:</p>
                          <p className="text-xs text-yellow-700">Generate 8s base → Extend +8s → Extend again → Repeat up to 20 times for 160s max</p>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Core Controls"
                    icon={Settings}
                    gradient="from-blue-500 to-cyan-500"
                  >
                    <div className="space-y-5 text-gray-700">
                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Prompt Input</h4>
                        <p className="text-sm text-gray-700 mb-2">Describe the motion, camera movement, lighting changes, and visual effects. Be specific about timing and pacing.</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-1">Good prompts include:</p>
                          <p className="text-xs text-blue-700">Camera movement (zoom, pan, dolly) • Speed (slow, fast) • Lighting (golden hour, dramatic) • Subject action • Mood/style</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Reference Images (up to 3)</h4>
                        <p className="text-sm text-gray-700 mb-2">Upload images to guide visual style, subject appearance, or color palette — similar to IMAGE tab but for video.</p>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-purple-900 mb-1">Use cases:</p>
                          <p className="text-xs text-purple-700">Lock product appearance • Match brand colors • Set artistic style • Control composition</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Start/End Images (Interpolation mode)</h4>
                        <p className="text-sm text-gray-700 mb-2">In Interpolation mode, upload exactly 2 images: first frame and last frame. Veo creates smooth motion between them.</p>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Base Video (Extension mode)</h4>
                        <p className="text-sm text-gray-700 mb-2">Upload an existing video to continue. The AI analyzes the last frames and extends the motion naturally.</p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-900 mb-1">Extension tip:</p>
                          <p className="text-xs text-green-700">Describe how you want the motion to evolve: "camera continues panning right" or "zoom accelerates"</p>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Output Settings"
                    icon={Maximize2}
                    gradient="from-orange-500 to-amber-500"
                  >
                    <div className="space-y-5 text-gray-700">
                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Duration</h4>
                        <p className="text-sm text-gray-700 mb-3">Choose clip length based on your needs:</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">4 seconds</p>
                              <p className="text-xs text-gray-600">Quick cuts, transitions</p>
                            </div>
                            <span className="text-xs font-bold text-green-600">€0.10</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">6 seconds</p>
                              <p className="text-xs text-gray-600">Social ads, Stories</p>
                            </div>
                            <span className="text-xs font-bold text-yellow-600">€0.30</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900 text-sm">8 seconds</p>
                              <p className="text-xs text-gray-600">Full scenes, Reels</p>
                            </div>
                            <span className="text-xs font-bold text-red-600">€0.50</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Resolution</h4>
                        <div className="grid md:grid-cols-3 gap-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="font-bold text-blue-900 text-sm mb-1">720p HD</p>
                            <p className="text-xs text-blue-700">Fast preview</p>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <p className="font-bold text-purple-900 text-sm mb-1">1080p Full HD</p>
                            <p className="text-xs text-purple-700">Social platforms</p>
                          </div>
                          <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                            <p className="font-bold text-pink-900 text-sm mb-1">4K Ultra HD</p>
                            <p className="text-xs text-pink-700">Premium quality</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Aspect Ratio</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-4">
                            <p className="font-black text-blue-900 mb-1">16:9 Landscape</p>
                            <p className="text-xs text-blue-700 mb-2">YouTube, TV, desktop ads</p>
                            <div className="bg-blue-900 rounded h-12 w-full" style={{ aspectRatio: '16/9' }}></div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                            <p className="font-black text-purple-900 mb-1">9:16 Portrait</p>
                            <p className="text-xs text-purple-700 mb-2">Stories, Reels, TikTok, Shorts</p>
                            <div className="bg-purple-900 rounded h-16 w-9 mx-auto"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Advanced Controls"
                    icon={Sliders}
                    gradient="from-green-500 to-emerald-500"
                  >
                    <div className="space-y-5 text-gray-700">
                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Negative Prompt</h4>
                        <p className="text-sm text-gray-700 mb-2">Specify unwanted elements, styles, or motion types.</p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-900 mb-1">Common negatives:</p>
                          <p className="text-xs text-red-700 font-mono">"camera shake, blur, distortion, sudden cuts, low quality, watermark, jittery motion"</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Seed</h4>
                        <p className="text-sm text-gray-700 mb-2">Control randomness for reproducible results. Same seed + prompt = similar motion patterns.</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-900 mb-1">Pro workflow:</p>
                          <p className="text-xs text-blue-700">Generate → Like the motion? → Note seed → Refine prompt → Reuse seed</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-gray-900 mb-2">Number of Variations (1–4)</h4>
                        <p className="text-sm text-gray-700 mb-2">Generate multiple video variations from the same prompt. Each will have different camera angles, timing, or motion styles.</p>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Video Extension Workflow"
                    icon={FastForward}
                    gradient="from-yellow-500 to-orange-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Veo natively supports extending videos up to <strong>20 times</strong> — here's how to build longer narratives:</p>
                      
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6">
                        <h4 className="font-black text-yellow-900 mb-4">Extension Workflow:</h4>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                            <div>
                              <p className="font-bold text-yellow-900">Generate Base Clip (8s)</p>
                              <p className="text-sm text-yellow-700">Use Text→Video or Image→Video mode</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                            <div>
                              <p className="font-bold text-yellow-900">Switch to Extend Mode</p>
                              <p className="text-sm text-yellow-700">Upload your 8s video as base</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                            <div>
                              <p className="font-bold text-yellow-900">Describe Continuation</p>
                              <p className="text-sm text-yellow-700">"Camera continues panning right, revealing more of the scene"</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                            <div>
                              <p className="font-bold text-yellow-900">Generate Extension (+8s)</p>
                              <p className="text-sm text-yellow-700">Now you have 16s total</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">5</div>
                            <div>
                              <p className="font-bold text-yellow-900">Repeat Up to 20 Times</p>
                              <p className="text-sm text-yellow-700">Keep extending to build full narrative (160s max)</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-bold text-blue-900 mb-2">Pro tips for extensions:</p>
                        <ul className="space-y-1 text-xs text-blue-700">
                          <li>• Each extension should logically continue the previous motion</li>
                          <li>• Maintain consistent style/lighting in prompts</li>
                          <li>• Use similar pacing descriptions</li>
                          <li>• Can change camera angle or focus between extensions</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Best Practices for Video"
                    icon={CheckCircle2}
                    gradient="from-purple-500 to-fuchsia-500"
                  >
                    <div className="space-y-3 text-gray-700">
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                        <h4 className="font-black text-purple-900 mb-2">For Smooth Motion:</h4>
                        <ul className="space-y-1 text-sm text-purple-800">
                          <li>• Describe camera movement speed: "slow dolly in" not just "zoom"</li>
                          <li>• Avoid sudden transitions: "gradual" or "smooth"</li>
                          <li>• Use negative prompts: "no camera shake, no jitter"</li>
                          <li>• Reference images help maintain visual consistency</li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-black text-blue-900 mb-2">For Product Videos:</h4>
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• Use Image→Video with clean product photo</li>
                          <li>• Describe rotation angle: "360° clockwise rotation"</li>
                          <li>• Control lighting: "maintain consistent soft lighting"</li>
                          <li>• Keep product centered: "product stays in frame center"</li>
                        </ul>
                      </div>

                      <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
                        <h4 className="font-black text-pink-900 mb-2">For Social Video Ads:</h4>
                        <ul className="space-y-1 text-sm text-pink-800">
                          <li>• Use 9:16 ratio for Stories/Reels/TikTok</li>
                          <li>• 6–8s duration is ideal (attention span)</li>
                          <li>• Start with strong visual hook in first 2s</li>
                          <li>• Use Interpolation for before/after reveals</li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {activeTab === 'workflows' && (
                <div className="space-y-6">
                  <ExpandableSection
                    title="Reverse-Engineer Competitor Ads"
                    icon={Copy}
                    gradient="from-purple-500 to-indigo-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Analyze and recreate competitor visual styles:</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                          <div>
                            <p className="font-bold text-gray-900">Upload to CONCEPT Tab</p>
                            <p className="text-sm text-gray-600">Use "Reverse-Engineer Image" goal, upload competitor ad</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                          <div>
                            <p className="font-bold text-gray-900">Get Detailed Description</p>
                            <p className="text-sm text-gray-600">AI analyzes composition, lighting, style, colors, mood</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                          <div>
                            <p className="font-bold text-gray-900">Send to IMAGE Tab</p>
                            <p className="text-sm text-gray-600">Click arrow to transfer prompt automatically</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                          <div>
                            <p className="font-bold text-gray-900">Swap Your Product</p>
                            <p className="text-sm text-gray-600">Upload your product as Subject Reference, keep the style</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Consistent Product Photography Sets"
                    icon={Grid3x3}
                    gradient="from-blue-500 to-cyan-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Create 10+ product shots with identical product appearance:</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                          <div>
                            <p className="font-bold text-gray-900">Upload Product Photo</p>
                            <p className="text-sm text-gray-600">Add as Subject Reference in IMAGE tab</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                          <div>
                            <p className="font-bold text-gray-900">Add Style References</p>
                            <p className="text-sm text-gray-600">Upload 3–5 images with desired background/lighting style</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                          <div>
                            <p className="font-bold text-gray-900">Generate Variations</p>
                            <p className="text-sm text-gray-600">Change background/setting in prompt: "on wooden table", "in modern kitchen", etc.</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                          <div>
                            <p className="font-bold text-gray-900">Lock Seed for Consistency</p>
                            <p className="text-sm text-gray-600">Note successful seed, reuse for next variations</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Multi-Format Campaign (9:16, 1:1, 16:9)"
                    icon={Maximize2}
                    gradient="from-green-500 to-emerald-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Create one concept, export for all platforms:</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                          <div>
                            <p className="font-bold text-gray-900">CONCEPT Tab</p>
                            <p className="text-sm text-gray-600">Generate Campaign Concept or Prompt Pack</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                          <div>
                            <p className="font-bold text-gray-900">IMAGE Tab - Stories (9:16)</p>
                            <p className="text-sm text-gray-600">Generate vertical format for Instagram Stories, Reels</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                          <div>
                            <p className="font-bold text-gray-900">IMAGE Tab - Feed (1:1)</p>
                            <p className="text-sm text-gray-600">Same prompt, change to square for Instagram feed</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                          <div>
                            <p className="font-bold text-gray-900">IMAGE Tab - Desktop (16:9)</p>
                            <p className="text-sm text-gray-600">Wide format for Facebook ads, website banners</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center font-black text-sm shrink-0">5</div>
                          <div>
                            <p className="font-bold text-gray-900">Keep Style Consistent</p>
                            <p className="text-sm text-gray-600">Use same Subject Reference + Style References + Seed across all</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Video Extension (8s → 40s)"
                    icon={Film}
                    gradient="from-red-500 to-pink-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Build longer video narratives:</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                          <div>
                            <p className="font-bold text-gray-900">Generate Opening (8s)</p>
                            <p className="text-sm text-gray-600">Text→Video: "Close-up of luxury watch, slow rotation, golden hour lighting"</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                          <div>
                            <p className="font-bold text-gray-900">Extend Scene 1 (+8s)</p>
                            <p className="text-sm text-gray-600">"Camera pulls back revealing the watch on marble surface"</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                          <div>
                            <p className="font-bold text-gray-900">Extend Scene 2 (+8s)</p>
                            <p className="text-sm text-gray-600">"Pan across surface to reveal watch box and leather strap"</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                          <div>
                            <p className="font-bold text-gray-900">Extend Scene 3 (+8s)</p>
                            <p className="text-sm text-gray-600">"Slow zoom into watch face, focus on brand logo"</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">5</div>
                          <div>
                            <p className="font-bold text-gray-900">Final Extension (+8s)</p>
                            <p className="text-sm text-gray-600">"Fade to product title card with brand name"</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mt-4">
                        <p className="text-sm font-bold text-pink-900 mb-2">Result:</p>
                        <p className="text-sm text-pink-800">40-second continuous video with consistent style and smooth transitions</p>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="A/B Testing with Seeds"
                    icon={GitBranch}
                    gradient="from-yellow-500 to-orange-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Test multiple creative directions systematically:</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">1</div>
                          <div>
                            <p className="font-bold text-gray-900">Generate Base Version</p>
                            <p className="text-sm text-gray-600">Create your control image/video, note the seed number</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">2</div>
                          <div>
                            <p className="font-bold text-gray-900">Test Variable A</p>
                            <p className="text-sm text-gray-600">Change one element: background color. Use same seed</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">3</div>
                          <div>
                            <p className="font-bold text-gray-900">Test Variable B</p>
                            <p className="text-sm text-gray-600">Change different element: lighting angle. Use same seed</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-yellow-600 text-white flex items-center justify-center font-black text-sm shrink-0">4</div>
                          <div>
                            <p className="font-bold text-gray-900">Compare Results</p>
                            <p className="text-sm text-gray-600">Same composition, isolated changes — perfect for testing</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="space-y-6">
                  <ExpandableSection
                    title="Writing Better Prompts"
                    icon={FileText}
                    gradient="from-purple-500 to-indigo-500"
                    defaultOpen={true}
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                        <h4 className="font-black text-purple-900 mb-3">Prompt Structure (IMAGE & VIDEO):</h4>
                        <div className="space-y-2 text-sm text-purple-800">
                          <p><strong>1. Subject:</strong> What is the main focus?</p>
                          <p><strong>2. Action/Motion:</strong> What's happening? (video only)</p>
                          <p><strong>3. Setting:</strong> Where is this taking place?</p>
                          <p><strong>4. Lighting:</strong> What's the light quality/direction?</p>
                          <p><strong>5. Style:</strong> Photography style, artistic direction</p>
                          <p><strong>6. Technical:</strong> Camera angle, composition details</p>
                        </div>
                        <div className="mt-4 bg-white rounded-lg p-3 border border-purple-300">
                          <p className="text-xs font-bold text-purple-900 mb-2">Example (good prompt):</p>
                          <p className="text-xs text-purple-700 font-mono leading-relaxed">
                            "Premium wireless headphones [subject] on white marble surface [setting], soft diffused natural lighting from left creating subtle shadows [lighting], minimalist product photography style [style], shot from 45-degree angle with shallow depth of field [technical]"
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                        <h4 className="font-black text-blue-900 mb-3">Do's and Don'ts:</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> DO:
                            </p>
                            <ul className="space-y-1 text-sm text-blue-800">
                              <li>• Be specific about details</li>
                              <li>• Describe lighting direction</li>
                              <li>• Mention camera angles</li>
                              <li>• Use photography terms</li>
                              <li>• Include mood/atmosphere</li>
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                              <X className="w-4 h-4" /> DON'T:
                            </p>
                            <ul className="space-y-1 text-sm text-blue-800">
                              <li>• Use vague terms like "nice"</li>
                              <li>• Overload with 20+ adjectives</li>
                              <li>• Contradict yourself</li>
                              <li>• Request impossible physics</li>
                              <li>• Forget negative prompts</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Using References Effectively"
                    icon={Image}
                    gradient="from-blue-500 to-cyan-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                        <h4 className="font-black text-blue-900 mb-3">Subject Reference Best Practices:</h4>
                        <ul className="space-y-2 text-sm text-blue-800">
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                            <span><strong>Clean background:</strong> Upload product on plain/simple background</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                            <span><strong>Good lighting:</strong> Well-lit subject shows better detail</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                            <span><strong>High resolution:</strong> Upload at least 1024px for best results</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                            <span><strong>Single subject:</strong> One product/person per reference</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                        <h4 className="font-black text-purple-900 mb-3">Style Reference Best Practices:</h4>
                        <ul className="space-y-2 text-sm text-purple-800">
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                            <span><strong>3–5 references:</strong> Sweet spot for consistency without conflict</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                            <span><strong>Similar aesthetics:</strong> Don't mix cartoon + photorealistic</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                            <span><strong>Color harmony:</strong> References should share similar color palettes</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                            <span><strong>Mix types:</strong> Combine photography, art, mood boards</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="When to Use Web Search"
                    icon={Globe}
                    gradient="from-green-500 to-emerald-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <p className="font-medium">Web Search grounds AI outputs in real-time data from the internet. Use it strategically:</p>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <h4 className="font-black text-green-900 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Use Web Search For:
                          </h4>
                          <ul className="space-y-1.5 text-sm text-green-800">
                            <li>• Current trends and viral content</li>
                            <li>• Real locations and landmarks</li>
                            <li>• Existing products/brands</li>
                            <li>• News-related campaigns</li>
                            <li>• Industry-specific data</li>
                            <li>• Competitor research</li>
                          </ul>
                        </div>

                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                          <h4 className="font-black text-red-900 mb-2 flex items-center gap-2">
                            <X className="w-5 h-5" />
                            Skip Web Search For:
                          </h4>
                          <ul className="space-y-1.5 text-sm text-red-800">
                            <li>• Fictional/imaginary concepts</li>
                            <li>• Abstract creative direction</li>
                            <li>• Timeless aesthetic styles</li>
                            <li>• Generic product categories</li>
                            <li>• When speed matters more</li>
                            <li>• Privacy-sensitive content</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Seed Management"
                    icon={Hash}
                    gradient="from-yellow-500 to-orange-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                        <h4 className="font-black text-yellow-900 mb-3">How Seeds Work:</h4>
                        <p className="text-sm text-yellow-800 mb-4">
                          A seed is a number (0–999999999) that controls the randomness in AI generation. Same seed + same prompt + same settings = highly similar results.
                        </p>
                        <div className="bg-white rounded-lg p-4 border border-yellow-300">
                          <p className="text-xs font-bold text-yellow-900 mb-2">Example:</p>
                          <div className="space-y-2 text-xs text-yellow-800">
                            <p><strong>Seed 12345 + "red car"</strong> = Specific red car composition</p>
                            <p><strong>Seed 12345 + "blue car"</strong> = Same composition, different color</p>
                            <p><strong>Seed 67890 + "red car"</strong> = Different composition entirely</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                        <h4 className="font-black text-orange-900 mb-3">Seed Strategies:</h4>
                        <div className="space-y-3 text-sm text-orange-800">
                          <div>
                            <p className="font-bold mb-1">Random Exploration:</p>
                            <p>Leave seed empty to get diverse results each time</p>
                          </div>
                          <div>
                            <p className="font-bold mb-1">Iterative Refinement:</p>
                            <p>Lock seed, tweak prompt slightly to refine composition</p>
                          </div>
                          <div>
                            <p className="font-bold mb-1">A/B Testing:</p>
                            <p>Same seed across variations = isolated testing</p>
                          </div>
                          <div>
                            <p className="font-bold mb-1">Campaign Consistency:</p>
                            <p>Save successful seeds for future assets in same campaign</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Troubleshooting Common Issues"
                    icon={AlertCircle}
                    gradient="from-red-500 to-pink-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                        <h4 className="font-black text-red-900 mb-3">API Key Issues:</h4>
                        <div className="space-y-3 text-sm">
                          <div className="bg-white rounded-lg p-3 border border-red-300">
                            <p className="font-bold text-red-900 mb-1">Error: "Invalid API Key"</p>
                            <p className="text-red-700 mb-2">Solution: Check that you copied the full key from Google AI Studio. It should start with "AIza..."</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-red-300">
                            <p className="font-bold text-red-900 mb-1">Error: "Quota Exceeded"</p>
                            <p className="text-red-700 mb-2">Solution: You've hit Google's rate limit. Wait a few minutes or upgrade your Google Cloud quota.</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-red-300">
                            <p className="font-bold text-red-900 mb-1">Error: "API Key Not Set"</p>
                            <p className="text-red-700 mb-2">Solution: Click Settings icon (top-right), paste your Google Gemini API key, save.</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5">
                        <h4 className="font-black text-yellow-900 mb-3">Quality Issues:</h4>
                        <div className="space-y-3 text-sm">
                          <div className="bg-white rounded-lg p-3 border border-yellow-300">
                            <p className="font-bold text-yellow-900 mb-1">Problem: Blurry or distorted images</p>
                            <p className="text-yellow-700">Add to negative prompt: "blurry, distorted, low quality, pixelated"</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-yellow-300">
                            <p className="font-bold text-yellow-900 mb-1">Problem: Subject doesn't match reference</p>
                            <p className="text-yellow-700">Enable "Subject Mode" toggle and ensure reference image is high quality</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-yellow-300">
                            <p className="font-bold text-yellow-900 mb-1">Problem: Unwanted elements in scene</p>
                            <p className="text-yellow-700">Be very specific in negative prompt about what to avoid</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                        <h4 className="font-black text-blue-900 mb-3">Browser Issues:</h4>
                        <div className="space-y-3 text-sm">
                          <div className="bg-white rounded-lg p-3 border border-blue-300">
                            <p className="font-bold text-blue-900 mb-1">Problem: Slow performance</p>
                            <p className="text-blue-700">Clear browser cache, close unused tabs, try Chrome/Edge for best performance</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-300">
                            <p className="font-bold text-blue-900 mb-1">Problem: API key not saving</p>
                            <p className="text-blue-700">Check if browser is blocking localStorage. Enable cookies/storage for this site.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection
                    title="Cost Optimization Tips"
                    icon={TrendingDown}
                    gradient="from-purple-500 to-fuchsia-500"
                  >
                    <div className="space-y-4 text-gray-700">
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
                        <h4 className="font-black text-purple-900 mb-3">Save Money Without Sacrificing Quality:</h4>
                        <ul className="space-y-2 text-sm text-purple-800">
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><strong>Start at 1K or 2K:</strong> Preview at lower resolution, finalize at 4K</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><strong>Use Gemini Flash:</strong> Faster and cheaper for CONCEPT generations</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><strong>Batch similar prompts:</strong> Generate 4 variations at once vs. 4 separate calls</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><strong>Refine with seeds:</strong> Lock good composition, iterate cheaply</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><strong>Plan in CONCEPT first:</strong> Better prompts = fewer failed generations</span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><strong>Set Google Cloud budget alerts:</strong> Get notified before overspending</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-green-900 mb-2">Estimated costs for 100 campaign assets:</p>
                        <p className="text-sm text-green-800">€5–€20 total — far cheaper than stock photos or agency work</p>
                      </div>
                    </div>
                  </ExpandableSection>
                </div>
              )}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
