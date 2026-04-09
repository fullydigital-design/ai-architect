import { motion } from 'motion/react';
import { 
  Sparkles, 
  Lightbulb, 
  Image, 
  Video, 
  Wand2, 
  Edit3, 
  ZoomIn,
  Zap,
  Workflow,
  MessageSquare,
  Mic,
  Layers,
  Maximize2,
  Film,
  GitBranch,
  Download,
  Globe,
  Database,
  ChevronRight,
  Check,
  Star,
  Boxes
} from 'lucide-react';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';
import { Button } from '@/app/components/ui/button';

export function FeaturesPage({ 
  onNavigate, 
  onGetStarted,
  currentPage 
}: { 
  onNavigate?: (page: string) => void;
  onGetStarted?: () => void;
  currentPage?: string;
}) {
  const coreFeatures = [
    {
      icon: Lightbulb,
      title: "Strategic Planning",
      description: "Brainstorm in the CONCEPT tab. Get campaign briefs, prompt packs, shotlists, and ad copy — then send them directly to image or video generation.",
      gradient: "from-purple-500 via-indigo-500 to-violet-500",
      items: [
        "8 strategic goal types",
        "Campaign brief generation",
        "Multi-language support",
        "Send to IMAGE/VIDEO tabs"
      ]
    },
    {
      icon: Image,
      title: "Image Generation",
      description: "Campaign-ready visuals from a prompt. Clean lighting, strong composition, and high-quality output with Imagen 3.0.",
      gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
      items: [
        "1K, 2K, 4K resolution",
        "10 aspect ratios",
        "1-4 variations per generation",
        "Photorealistic quality"
      ]
    },
    {
      icon: Video,
      title: "Video Generation",
      description: "Short-form motion for ads. Generate quick variations for social formats and creative testing with Veo 2.0/3.1.",
      gradient: "from-purple-500 via-violet-500 to-indigo-500",
      items: [
        "Text→Video, Image→Video",
        "4s, 6s, 8s, 10s durations",
        "720p, 1080p, 4K output",
        "Cinematic camera control"
      ]
    },
    {
      icon: Wand2,
      title: "Subject & Style References",
      description: "Keep identity and look consistent. Lock the subject (1 image) and match the finishing across a set.",
      gradient: "from-blue-500 via-cyan-500 to-teal-500",
      items: [
        "1 subject reference image",
        "Up to 14 style references (image)",
        "Up to 3 style references (video)",
        "Consistent brand identity"
      ]
    },
    {
      icon: Edit3,
      title: "Image Editing & Masks",
      description: "Edit mode with mask painting. Modify specific areas, regenerate selections, or refine details while keeping the rest intact.",
      gradient: "from-green-500 via-emerald-500 to-teal-500",
      items: [
        "Brush-based mask painting",
        "Selective regeneration",
        "Preserve original areas",
        "Iterative refinement"
      ]
    },
    {
      icon: ZoomIn,
      title: "Upscale & Enhance",
      description: "Polish the final output. Sharper details, cleaner textures, better realism — in one click.",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      items: [
        "1K, 2K, 4K options",
        "Enhanced details",
        "Better realism",
        "One-click processing"
      ]
    },
    {
      icon: Zap,
      title: "Variations & Control",
      description: "Generate 1-4 variations at once. Use seed for repeatability, negative prompts for exclusions, and precise controls.",
      gradient: "from-pink-500 via-rose-500 to-red-500",
      items: [
        "Multiple variations",
        "Seed control for repeatability",
        "Negative prompts",
        "Precise parameter control"
      ]
    },
    {
      icon: Workflow,
      title: "Workflow-First UI",
      description: "Built for speed and production. A clean interface that keeps you moving — not tuning settings all day.",
      gradient: "from-orange-500 via-amber-500 to-yellow-500",
      items: [
        "Smart gallery system",
        "Type filters (all/concept/image/video)",
        "Quick iteration tools",
        "Production-optimized"
      ]
    }
  ];

  const workflows = [
    {
      category: "Basic Workflows",
      description: "Essential AI tools for everyday creative work",
      icon: Boxes,
      gradient: "from-blue-500 to-cyan-500",
      items: [
        {
          name: "Google Gemini",
          description: "Complete AI creative suite with Concept, Image, and Video tabs",
          features: ["Text to Image", "Text to Video", "Image to Video", "Concept Strategy"]
        },
        {
          name: "Google Template: Concept",
          description: "Strategic planning and ideation focused workflow",
          features: ["Campaign strategy", "Creative briefs", "Prompt generation", "8 goal types"]
        },
        {
          name: "Google Template: Image",
          description: "Optimized for visual content creation",
          features: ["Text to Image", "Multiple ratios", "Style references", "High quality"]
        },
        {
          name: "Google Template: Video",
          description: "Dedicated motion content workflow",
          features: ["Text to Video", "Image to Video", "Cinematic control", "Up to 10s"]
        }
      ]
    },
    {
      category: "Pro Workflows",
      description: "Advanced AI models for professional creative production",
      icon: Star,
      gradient: "from-purple-500 to-fuchsia-500",
      items: [
        {
          name: "Flux Pro",
          description: "State-of-the-art image generation with photorealistic quality",
          features: ["Text to Image", "LoRA custom styles", "Perfect text rendering", "Brand consistency"]
        },
        {
          name: "Kling AI",
          description: "Professional video generation with advanced motion",
          features: ["Text to Video", "Image to Video", "Motion brush", "Camera controls"]
        },
        {
          name: "Runway",
          description: "Next-gen video with Director Mode",
          features: ["Text to Video", "Image to Video", "Director Mode", "Camera movements"]
        },
        {
          name: "ComfyUI",
          description: "Node-based workflow system for power users",
          features: ["Custom models", "Node editor", "Advanced pipelines", "Infinite flexibility"]
        },
        {
          name: "Claude",
          description: "Advanced AI assistant by Anthropic",
          features: ["Strategic planning", "Copywriting", "200K+ context", "Ethical reasoning"]
        },
        {
          name: "ElevenLabs",
          description: "Professional AI voice generation and dubbing",
          features: ["Voice cloning", "Multi-language", "Voiceovers", "Voice design"]
        },
        {
          name: "Magnific AI",
          description: "Revolutionary AI upscaler and enhancer",
          features: ["16x upscaling", "Detail hallucination", "HDR processing", "Creative enhancement"]
        },
        {
          name: "PRO Workflow Builder",
          description: "Visual node-based workflow builder for custom AI pipelines",
          features: ["Node editor", "Connect multiple AIs", "Save workflows", "Advanced automation"]
        }
      ]
    }
  ];

  const technicalFeatures = [
    {
      icon: Download,
      title: "Local API Key Management",
      description: "Your API keys are stored locally in your browser. All API calls go directly to providers — we never see your content.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Globe,
      title: "Browser-Based",
      description: "Runs entirely in your browser. No server-side processing, no data storage, no backend. Pure client-side power.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Database,
      title: "Local Storage",
      description: "API keys, settings, and preferences stored locally. You maintain complete control over your data and credentials.",
      gradient: "from-purple-500 to-fuchsia-500"
    },
    {
      icon: Zap,
      title: "Multiple Providers",
      description: "Integration with 11+ AI providers including Google, Anthropic, Flux, Kling, Runway, ElevenLabs, and more.",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation onNavigate={onNavigate} currentPage={currentPage} onGetStarted={onGetStarted} />
      <DisclaimerBanner />

      <div className="pt-[125px]">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden bg-gradient-to-b from-white via-purple-50/30 to-white">
          {/* Background Effects */}
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
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-bold uppercase tracking-wider">Complete Feature Set</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-gray-900 mb-6"
            >
              Everything You Need for{' '}
              <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
                AI Creative Production
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 font-medium max-w-2xl mx-auto mb-8"
            >
              A comprehensive AI creative suite with 11+ workflows, advanced generation controls, and privacy-first architecture. 
              From strategy to export-ready assets.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Button 
                onClick={onGetStarted}
                className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 text-lg px-10 py-7 rounded-2xl shadow-2xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 transition-all font-bold"
              >
                Try It Free
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Core Features */}
        <section className="relative py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20 mb-6">
                <span className="text-sm text-white font-bold uppercase tracking-wider">Core Features</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Powerful Tools for Every Stage
              </h2>
              <p className="text-xl text-gray-600 font-medium">
                From concept to final export, everything you need in one place
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {coreFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group relative"
                  >
                    <div className="relative h-full p-8 rounded-3xl bg-white border-2 border-gray-100 hover:border-transparent hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
                      {/* Gradient border on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-300 rounded-3xl`} />
                      <div className="absolute inset-[2px] bg-white rounded-3xl -z-10" />
                      
                      {/* Icon */}
                      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 mb-6 shadow-xl shadow-purple-500/20`}>
                        <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                      </div>

                      {/* Content */}
                      <h3 className="text-2xl font-black text-gray-900 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed font-medium mb-6">
                        {feature.description}
                      </p>

                      {/* Feature items */}
                      <div className="space-y-2">
                        {feature.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 font-medium">{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* Decorative corner */}
                      <div className={`absolute top-6 right-6 w-3 h-3 rounded-full bg-gradient-to-br ${feature.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Workflows Section */}
        <section className="relative py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
                <span className="text-sm text-white font-bold uppercase tracking-wider">11+ AI Workflows</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Multiple AI Providers, One Platform
              </h2>
              <p className="text-xl text-gray-600 font-medium">
                Access the best AI models from Google, Anthropic, Flux, Kling, Runway, and more
              </p>
            </motion.div>

            <div className="space-y-12">
              {workflows.map((section, sectionIdx) => {
                const CategoryIcon = section.icon;
                return (
                  <motion.div
                    key={sectionIdx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: sectionIdx * 0.1 }}
                  >
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-lg`}>
                        <CategoryIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900">{section.category}</h3>
                      <p className="text-sm text-gray-600 font-medium">{section.description}</p>
                    </div>

                    {/* Workflow Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {section.items.map((workflow, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          className="p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
                        >
                          <h4 className="text-xl font-black text-gray-900 mb-2">{workflow.name}</h4>
                          <p className="text-gray-600 text-sm mb-4 font-medium">{workflow.description}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {workflow.features.map((feature, featureIdx) => (
                              <span 
                                key={featureIdx}
                                className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Technical Features */}
        <section className="relative py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-block px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/20 mb-6">
                <span className="text-sm text-white font-bold uppercase tracking-wider">Technical Excellence</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Built for Privacy & Performance
              </h2>
              <p className="text-xl text-gray-600 font-medium">
                Modern architecture that puts you in control
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {technicalFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 mx-auto mb-4 shadow-lg`}>
                      <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Ready to Transform Your Creative Workflow?
              </h2>
              <p className="text-xl text-purple-100 font-medium mb-8">
                Start creating professional AI-powered content today. No credit card required during beta.
              </p>
              <Button 
                onClick={onGetStarted}
                className="bg-white text-purple-600 hover:bg-purple-50 border-0 text-lg px-10 py-7 rounded-2xl shadow-2xl hover:shadow-purple-900/50 hover:scale-105 transition-all font-bold"
              >
                Get Started Free
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}