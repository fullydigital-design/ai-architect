import { motion } from 'motion/react';
import { Sparkles, Zap, Layers, Video, Workflow, Film, MessageSquare, Mic, Maximize2, Lightbulb, Image } from 'lucide-react';
import { WorkflowCard } from '@/app/components/WorkflowCard';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';
import { tokens } from '@/styles/tokens';
import { useState } from 'react';

export function WorkflowSelectionPage({ 
  onNavigate, 
  onSelectWorkflow,
  currentPage 
}: { 
  onNavigate?: (page: string) => void;
  onSelectWorkflow?: (workflow: string) => void;
  currentPage?: string;
}) {
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const workflows: Array<{
    id: string;
    icon: any;
    title: string;
    description: string;
    gradient: string;
    isAvailable: boolean;
    features: string[];
    isPro?: boolean;
    span?: string;
    categories?: string[];
    isDev?: boolean;
    isDemo?: boolean;
  }> = [
    {
      id: 'pro',
      icon: Workflow,
      title: 'PRO Workflow Builder',
      description: 'Build custom node-based workflows by connecting Google AI models. Mix concepts, images, and videos in complex pipelines with visual programming.',
      gradient: 'from-blue-500 to-cyan-500',
      isAvailable: true,
      features: [
        'Visual node-based builder',
        'Connect multiple AI models',
        'Save & reuse workflows',
        'Advanced automation'
      ],
      isPro: true,
      span: 'md:col-span-2',
      categories: ['dev'],
      isDev: false
    },
    {
      id: 'google',
      icon: Sparkles,
      title: 'Google Gemini',
      description: 'Complete AI creative suite with Nano Banana for concepts, Imagen for visuals, and Veo 3.1 for professional video generation.',
      gradient: tokens.gradients.purple,
      isAvailable: true,
      features: [
        '8 strategic goal types',
        '14 style references',
        '4 video generation modes',
        'Smart resolution constraints'
      ],
      categories: ['text', 'image', 'video', 'production']
    },
    {
      id: 'google-template-concept',
      icon: Lightbulb,
      title: 'Google Template: Concept',
      description: 'Focused on strategy and ideation. Perfect Google template for campaign planning, creative briefs, and strategic thinking.',
      gradient: 'from-purple-500 to-pink-500',
      isAvailable: true,
      features: [
        'Campaign strategy mode',
        'Gemini 2.0 Flash powered',
        'Creative brief generation',
        'Idea exploration tools'
      ],
      categories: ['text', 'production']
    },
    {
      id: 'google-template-image',
      icon: Image,
      title: 'Google Template: Image',
      description: 'Optimized for visual content. Perfect Google template for product shots, advertising creatives, and brand visuals.',
      gradient: 'from-blue-500 to-cyan-500',
      isAvailable: true,
      features: [
        'Imagen 3.0 generation',
        'Photorealistic quality',
        'Safety filters included',
        'Multiple aspect ratios'
      ],
      categories: ['image', 'production']
    },
    {
      id: 'google-template-video',
      icon: Video,
      title: 'Google Template: Video',
      description: 'Dedicated to motion content. Perfect Google template for ads, social videos, and cinematic content creation.',
      gradient: 'from-red-500 to-orange-500',
      isAvailable: true,
      features: [
        'Veo 2.0 video engine',
        'Cinematic camera control',
        'Up to 10s generation',
        'Physics simulation'
      ],
      categories: ['video', 'production']
    },
    {
      id: 'flux',
      icon: Zap,
      title: 'Flux Pro',
      description: 'State-of-the-art image generation with photorealistic quality, perfect text rendering, and LoRA support for custom brand styles.',
      gradient: tokens.gradients.warning,
      isAvailable: true,
      features: [
        'Photorealistic quality',
        'Perfect text rendering',
        'LoRA custom styles',
        'Lightning-fast generation'
      ],
      categories: ['image', 'dev'],
      isDev: false,
      isDemo: true
    },
    {
      id: 'kling',
      icon: Video,
      title: 'Kling AI',
      description: 'Professional video generation with industry-leading quality, advanced motion brush, and precise camera controls for cinematic results.',
      gradient: tokens.gradients.secondary,
      isAvailable: true,
      features: [
        'Professional video quality',
        'Advanced motion brush',
        'Precise camera controls',
        'Up to 10s video length'
      ],
      categories: ['video', 'dev'],
      isDev: false,
      isDemo: true
    },
    {
      id: 'runway',
      icon: Film,
      title: 'Runway',
      description: 'Next-generation video creation with Director Mode, advanced motion controls, and cinematic camera movements for professional results.',
      gradient: 'from-green-500 to-emerald-500',
      isAvailable: true,
      features: [
        'Director Mode controls',
        'Text & Image to video',
        'Cinematic camera moves',
        'Up to 10s generation'
      ],
      categories: ['video', 'dev'],
      isDev: false,
      isDemo: true
    },
    {
      id: 'comfyui',
      icon: Layers,
      title: 'ComfyUI',
      description: 'Node-based workflow system for advanced users who want complete control over AI generation pipelines with custom models.',
      gradient: 'from-indigo-500 to-purple-500',
      isAvailable: true,
      features: [
        'Node-based workflows',
        'Custom model support',
        'Advanced fine-tuning',
        'Infinite flexibility'
      ],
      categories: ['dev'],
      isDev: false,
      isDemo: true
    },
    {
      id: 'claude',
      icon: MessageSquare,
      title: 'Claude',
      description: 'Advanced AI assistant by Anthropic for strategic planning, copywriting, and creative brainstorming with superior context understanding.',
      gradient: 'from-amber-500 to-orange-500',
      isAvailable: true,
      features: [
        'Strategic planning',
        'Advanced copywriting',
        'Long context support',
        'Ethical AI reasoning'
      ],
      categories: ['text', 'dev'],
      isDev: false,
      isDemo: true
    },
    {
      id: 'elevenlabs',
      icon: Mic,
      title: 'ElevenLabs',
      description: 'Professional AI voice generation and dubbing for advertising voiceovers, podcasts, and multilingual content creation.',
      gradient: 'from-violet-500 to-purple-500',
      isAvailable: true,
      features: [
        'Natural voice cloning',
        'Multi-language support',
        'Professional voiceovers',
        'Voice design studio'
      ],
      categories: ['audio', 'dev'],
      isDev: false,
      isDemo: true
    },
    {
      id: 'magnific',
      icon: Maximize2,
      title: 'Magnific AI',
      description: 'Revolutionary AI upscaler and enhancer. Transform low-resolution images into stunning high-definition masterpieces with creative reimagining.',
      gradient: 'from-emerald-500 to-teal-500',
      isAvailable: true,
      features: [
        'Up to 16x upscaling',
        'Creative enhancement',
        'HDR processing',
        'Detail hallucination'
      ],
      categories: ['image', 'dev'],
      isDev: false,
      isDemo: true
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Navigation onNavigate={onNavigate} currentPage={currentPage} onGetStarted={() => {}} />
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
              <span className="text-sm text-white font-bold uppercase tracking-wider">AI WORKFLOWS</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-gray-900 mb-6"
            >
              Choose Your <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">AI Workflow</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 font-medium max-w-2xl mx-auto"
            >
              Select the AI provider that best fits your creative needs. Each workflow is optimized for specific use cases.
            </motion.p>
          </div>
        </section>

        {/* PRO Workflow Builder Card - Standalone Section */}
        <section className="relative py-8">
          <div className="max-w-7xl mx-auto px-6">
            {workflows
              .filter(workflow => workflow.id === 'pro')
              .map((workflow) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <WorkflowCard
                    icon={workflow.icon}
                    title={workflow.title}
                    description={workflow.description}
                    gradient={workflow.gradient}
                    isAvailable={workflow.isAvailable}
                    features={workflow.features}
                    onClick={() => onSelectWorkflow?.(workflow.id)}
                    isPro={workflow.isPro}
                    isDev={workflow.isDev}
                  />
                </motion.div>
              ))}
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="relative py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { id: 'all', label: 'All', icon: Sparkles },
                { id: 'production', label: 'Production', icon: Zap },
                { id: 'dev', label: 'Dev', icon: Layers },
                { id: 'text', label: 'Text', icon: MessageSquare },
                { id: 'image', label: 'Image', icon: Image },
                { id: 'video', label: 'Video', icon: Video },
                { id: 'audio', label: 'Audio', icon: Mic }
              ].map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Workflow Cards */}
        <section className="relative py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Filtered Workflows - Below PRO */}
              {workflows
                .filter(workflow => workflow.id !== 'pro') // Exclude PRO
                .filter(workflow => !workflow.id.startsWith('google-template-')) // Hide Google Templates
                .filter(workflow => workflow.id !== 'ideogram') // Remove Ideogram AI
                .filter(workflow => workflow.id !== 'stability') // Remove Stability AI
                .filter(workflow => workflow.id !== 'luma') // Remove Luma AI
                .filter(workflow => {
                  if (activeFilter === 'all') return true;
                  return workflow.categories?.includes(activeFilter);
                })
                .map((workflow, index) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: (index + 1) * 0.1 }}
                  className={workflow.span || ''}
                >
                  <WorkflowCard
                    icon={workflow.icon}
                    title={workflow.title}
                    description={workflow.description}
                    gradient={workflow.gradient}
                    isAvailable={workflow.isAvailable}
                    features={workflow.features}
                    onClick={() => onSelectWorkflow?.(workflow.id)}
                    isPro={workflow.isPro}
                    isDev={workflow.isDev}
                    isDemo={workflow.isDemo}
                  />
                </motion.div>
              ))}
            </div>

            {/* Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-100"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">
                    More Providers Coming Soon
                  </h3>
                  <p className="text-base text-gray-600 font-medium leading-relaxed">
                    We're actively working on integrating Flux Pro, Kling AI, and ComfyUI workflows. 
                    Start with Google Gemini today and get access to new providers as they launch. 
                    <span className="font-bold text-purple-600"> Your API keys stay 100% private.</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}