import { motion } from 'motion/react';
import { Copy, Users, Film, Grid3x3 } from 'lucide-react';

export function RealWorkflows() {
  const workflows = [
    {
      icon: Copy,
      title: "Reverse-Engineer Competitors",
      description: "Upload competitor ad → CONCEPT describes it → Generate your version with your product.",
      gradient: "from-purple-500 to-indigo-500"
    },
    {
      icon: Users,
      title: "Consistent Product Sets",
      description: "Lock subject image → Generate 10+ variations → Keep product identical across all contexts.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Film,
      title: "Multi-Format Campaigns",
      description: "One concept → Export for Reels (9:16), Feed (1:1), YouTube (16:9). Same style, all platforms.",
      gradient: "from-fuchsia-500 to-purple-500"
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
            <span className="text-sm text-white font-bold uppercase tracking-wider">Real Workflows</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            What you can actually build
          </h2>
          <p className="text-xl text-content-faint max-w-2xl mx-auto font-medium">
            Concrete examples of production workflows — not theoretical use cases.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {workflows.map((workflow, index) => {
            const Icon = workflow.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group"
              >
                <div className="relative h-full p-6 rounded-2xl bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-transparent hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                  <div className={`absolute inset-0 bg-gradient-to-br ${workflow.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                  
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${workflow.gradient} p-3 mb-4 shadow-lg`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  <h3 className="text-lg font-black text-gray-900 mb-3">
                    {workflow.title}
                  </h3>
                  <p className="text-content-faint text-sm leading-relaxed">
                    {workflow.description}
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