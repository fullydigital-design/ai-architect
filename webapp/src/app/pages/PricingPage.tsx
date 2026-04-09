import { motion } from 'motion/react';
import { Check, Sparkles, Zap, Crown, DollarSign, Key, TrendingDown, Users, Rocket, Shield, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { DisclaimerBanner } from '@/app/components/DisclaimerBanner';
import { CostCalculator } from '@/app/components/landing/CostCalculator';

export function PricingPage({ onNavigate, currentPage }: { onNavigate?: (page: string) => void; currentPage?: string }) {
  const howItWorksCards = [
    {
      icon: DollarSign,
      title: "Platform is Free",
      description: "WayBetter's interface, controls, and workflow are free during beta—and designed to stay free or low-cost long-term.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Key,
      title: "You Own the Key",
      description: "Connect your own Google Gemini API key. You pay Google directly based on usage. No markup, no hidden fees.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: TrendingDown,
      title: "Total Transparency",
      description: "See your Google API costs in real-time. Typical campaign: €5–20 for 100 assets. Far cheaper than stock or agency work.",
      gradient: "from-purple-500 to-fuchsia-500"
    }
  ];

  const plans = [
    {
      name: "Beta (Free Platform)",
      icon: Sparkles,
      price: "€0",
      period: "forever for the platform",
      description: "Perfect for real production work—just bring your Google API key",
      color: "from-green-500 to-emerald-500",
      popular: false,
      features: [
        "Complete CONCEPT → IMAGE → VIDEO workflow",
        "All 8 goal types (Campaign Concept, Creative Brief, etc.)",
        "Up to 14 style references for consistency",
        "All video modes: Text→Video, Image→Video, Extension",
        "1K / 2K / 4K resolution for images",
        "720p / 1080p / 4K for video",
        "No usage limits from WayBetter",
        "Privacy-first browser architecture"
      ],
      googleCosts: [
        "~€0.02–0.10 per image (Imagen 3)",
        "~€0.10–0.50 per video (Veo)",
        "~€0.001 per CONCEPT generation (Gemini)"
      ],
      estimate: "€5–20 for 100 campaign assets",
      buttonText: "Start Free",
      buttonVariant: "gradient"
    },
    {
      name: "Pro",
      icon: Zap,
      price: "Coming Soon",
      period: "",
      description: "Productivity features for creators and teams who ship campaigns faster",
      color: "from-fuchsia-500 to-purple-600",
      popular: true,
      features: [
        "Everything in Beta, plus:",
        "Prompt Libraries: Save & reuse successful prompts",
        "Brand tone templates",
        "Campaign preset packs",
        "Project organization by campaign/client",
        "Version history with diff view",
        "Batch workflows: 10+ variations in one click",
        "Multi-format export (all aspect ratios)",
        "Custom seed libraries",
        "Style reference collections",
        "Negative prompt templates"
      ],
      note: "+ your Google API costs",
      earlyAccess: "Join the waitlist for early access pricing and exclusive beta features",
      buttonText: "Get Early Access",
      buttonVariant: "gradient"
    },
    {
      name: "Studio / Enterprise",
      icon: Crown,
      price: "Custom",
      period: "pricing",
      description: "For agencies and in-house teams with custom workflows",
      color: "from-purple-500 to-indigo-600",
      popular: false,
      features: [
        "Everything in Pro, plus:",
        "Team Libraries: Shared prompts, styles, brand assets",
        "SSO & User Management",
        "Custom API key management (team pool or individual)",
        "White-label options",
        "Dedicated onboarding & training",
        "Priority feature requests",
        "SLA & support options",
        "Custom integrations"
      ],
      note: "+ your team's Google API costs",
      comingSoon: "Multi-model support (Flux, Sora, Runway) coming for ALL tiers",
      buttonText: "Book Demo",
      buttonVariant: "outline"
    }
  ];

  const faqs = [
    {
      question: "How much does Google actually charge?",
      answer: "Rough estimates (Google's pricing):\n• Image generation: €0.02–0.10 per image\n• Video generation: €0.10–0.50 per video\n• Concept/text: ~€0.001 per generation\n\nFor context: Creating 50 product shots + 10 video ads might cost €5–15 in API usage—less than one stock photo."
    },
    {
      question: "Do I need to pay WayBetter anything?",
      answer: "Not during beta. The platform is free. You only pay Google for the AI models you use (Gemini, Imagen, Veo).\n\nFuture pricing (if any) will be for Pro features like project organization, templates, and team workflows—never for basic generation."
    },
    {
      question: "What if I don't have a Google API key?",
      answer: "We'll provide step-by-step setup instructions. It takes ~3 minutes and requires a Google Cloud account (free to create, pay-as-you-go for API usage)."
    },
    {
      question: "Can I set spending limits?",
      answer: "Yes—in your Google Cloud console, you can set daily/monthly budgets to control costs. WayBetter never touches your billing."
    },
    {
      question: "Do I need prompt engineering skills?",
      answer: "No. You can start with a simple idea, then refine step-by-step using structured outputs from the CONCEPT tab."
    },
    {
      question: "Can I use it for commercial work?",
      answer: "Yes—just review outputs before publishing, as you would with any production tool."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Navigation onGetStarted={() => onNavigate?.('workflow-selection')} onNavigate={onNavigate} currentPage={currentPage} />
      <DisclaimerBanner />

      <div className="pt-[125px]">
        {/* Hero */}
        <section className="relative py-32 overflow-hidden bg-gradient-to-b from-white via-pink-50/20 to-white">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-bold uppercase tracking-wider">Beta Access</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-6xl md:text-7xl font-black text-gray-900 mb-6"
            >
              Free platform.
              <br />
              <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
                You control the costs.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-8 font-medium max-w-3xl mx-auto"
            >
              WayBetter is free during beta—and stays free as a platform. You bring your own Google Gemini API key and pay Google directly for what you use. No markup, no subscription, total transparency.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-6 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold">No WayBetter fees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold">Your API costs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-bold">Runs in your browser</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How Pricing Works */}
        <section className="relative py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                How WayBetter pricing works
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {howItWorksCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-transparent hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} p-4 mb-6 shadow-lg`}>
                        <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-4">{card.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{card.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="relative py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative ${plan.popular ? 'lg:-mt-8' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-bold uppercase tracking-wider shadow-lg shadow-purple-500/30">
                        Coming Soon
                      </div>
                    )}

                    <div className={`h-full rounded-3xl border-2 ${plan.popular ? 'border-fuchsia-200 shadow-2xl shadow-purple-500/20' : 'border-gray-200'} bg-white p-8 hover:border-fuchsia-300 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300`}>
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6 shadow-xl shadow-purple-500/20`}>
                        <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
                      </div>

                      {/* Plan name */}
                      <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 mb-6 font-medium text-sm">{plan.description}</p>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-5xl font-black text-gray-900">{plan.price}</span>
                          <span className="text-gray-500 font-semibold">{plan.period}</span>
                        </div>
                        {plan.note && (
                          <p className="text-sm text-gray-500 font-medium">{plan.note}</p>
                        )}
                        {plan.estimate && (
                          <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200">
                            <p className="text-sm font-bold text-green-800">Estimate: {plan.estimate}</p>
                          </div>
                        )}
                      </div>

                      {/* Google Costs (Beta only) */}
                      {plan.googleCosts && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-sm font-black text-blue-900 mb-2">What you pay Google:</p>
                          <ul className="space-y-1">
                            {plan.googleCosts.map((cost, i) => (
                              <li key={i} className="text-sm text-blue-800 font-medium">{cost}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Features */}
                      <div className="mb-6">
                        <p className="text-sm font-black text-gray-900 mb-3 uppercase tracking-wider">
                          {plan.googleCosts ? "What you get free:" : "What Pro adds:"}
                        </p>
                        <ul className="space-y-3">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-fuchsia-500 shrink-0 mt-0.5" strokeWidth={3} />
                              <span className="text-gray-700 font-medium text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Coming Soon Note */}
                      {plan.comingSoon && (
                        <div className="mb-6 p-3 rounded-xl bg-purple-50 border border-purple-200">
                          <p className="text-xs font-bold text-purple-800">{plan.comingSoon}</p>
                        </div>
                      )}

                      {/* Early Access Note */}
                      {plan.earlyAccess && (
                        <div className="mb-6 p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-sm font-bold text-blue-800">{plan.earlyAccess}</p>
                        </div>
                      )}

                      {/* CTA Button */}
                      <Button 
                        className={`w-full ${plan.buttonVariant === 'gradient' ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 shadow-xl shadow-purple-500/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} border-0 py-6 font-bold text-base rounded-2xl`}
                        onClick={() => plan.buttonText === 'Start Free' && onNavigate?.('studio')}
                      >
                        {plan.buttonText}
                      </Button>

                      {plan.buttonText === 'Start Free' && (
                        <p className="text-xs text-center text-gray-500 mt-3 font-medium">
                          + View Google Pricing
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cost Calculator - NEW */}
        <CostCalculator />

        {/* Trust & Transparency */}
        <section className="relative py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-4xl font-black text-gray-900 mb-6">
                What "free during beta" really means
              </h2>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border-2 border-purple-100 text-left">
                <p className="text-gray-700 mb-6 font-medium leading-relaxed">
                  WayBetter's platform is free while we:
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-3">
                    <Rocket className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">Ship missing features (batch workflows, project management)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Rocket className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">Refine controls based on real production use</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Rocket className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">Add multi-model support (Flux, Sora, etc.)</span>
                  </li>
                </ul>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
                    <p className="text-sm font-black text-green-800 mb-3 uppercase tracking-wider">What won't change:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" strokeWidth={3} />
                        <span className="text-sm text-gray-700 font-medium">Privacy-first architecture (your key, your data)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" strokeWidth={3} />
                        <span className="text-sm text-gray-700 font-medium">No markup on Google API costs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" strokeWidth={3} />
                        <span className="text-sm text-gray-700 font-medium">Core workflow stays accessible (free or low-cost tier)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border-2 border-orange-200">
                    <p className="text-sm font-black text-orange-800 mb-3 uppercase tracking-wider">What might change:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 font-medium">Pro features may launch with paid tiers (~€19–39/mo)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 font-medium">Some advanced organization tools may move to Pro</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-100 rounded-xl border border-purple-300">
                  <p className="text-sm text-purple-900 font-bold text-center">
                    We'll announce any pricing changes 60 days in advance—and existing beta users get locked-in early pricing.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="relative py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
            </motion.div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-fuchsia-200 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
                >
                  <h3 className="text-xl font-black text-gray-900 mb-4">{faq.question}</h3>
                  <p className="text-gray-700 font-medium leading-relaxed whitespace-pre-line">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative py-32 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
                Start building better ads—
                <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">free</span>
              </h2>
              <p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto font-medium">
                Get your Google API key, connect it to WayBetter, and start generating production-ready assets in minutes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 text-white border-0 text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-purple-500/40 font-bold"
                  onClick={() => onNavigate?.('studio')}
                >
                  Start Free (Beta)
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-purple-600/30 text-purple-700 hover:bg-white hover:border-purple-600/50 text-lg px-12 py-7 rounded-2xl backdrop-blur-sm bg-white/80 font-bold"
                  onClick={() => onNavigate?.('docs')}
                >
                  Setup Guide
                </Button>
              </div>

              <p className="text-sm text-gray-600 font-medium">
                No WayBetter subscription required. You only pay Google for what you generate (~€5–20 for typical campaigns).
              </p>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}