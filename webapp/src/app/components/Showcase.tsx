import { motion } from 'motion/react';
import { Terminal, Upload, Settings2, Download } from 'lucide-react';

export function Showcase() {
  return (
    <section className="relative py-32 bg-gradient-to-b from-white via-pink-50/20 to-white overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-fuchsia-400 to-pink-500 opacity-10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-purple-400 to-blue-500 opacity-10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
            Workflow Made <span className="bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Simple</span>
          </h2>
          <p className="text-xl text-content-faint font-medium">
            Four steps to perfection
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              icon: Upload,
              title: "Subject Image",
              description: "Upload subject drag & drop or click",
              color: "fuchsia"
            },
            {
              step: "02",
              icon: Settings2,
              title: "Style Images",
              description: "Upload style reference drag & drop or click",
              color: "purple"
            },
            {
              step: "03",
              icon: Terminal,
              title: "Describe Scene",
              description: "e.g., 'The character walking through the city...'",
              color: "blue"
            },
            {
              step: "04",
              icon: Download,
              title: "Generate",
              description: "Resolution: 1K, 2K, 4K / Ratio: 1:1, 16:9",
              color: "pink"
            }
          ].map((item, index) => {
            const Icon = item.icon;
            const gradients = {
              fuchsia: "from-fuchsia-500 via-pink-500 to-rose-500",
              purple: "from-purple-500 via-violet-500 to-indigo-500",
              blue: "from-blue-500 via-cyan-500 to-teal-500",
              pink: "from-pink-500 via-rose-500 to-red-500"
            };

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group"
              >
                {/* Connecting line */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-purple-200 to-transparent -z-10" />
                )}

                <div className="relative h-full p-6 rounded-3xl border-2 border-gray-100 bg-white hover:border-transparent hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden">
                  {/* Gradient border on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradients[item.color as keyof typeof gradients]} opacity-0 group-hover:opacity-100 -z-10 transition-opacity duration-300`} />
                  <div className="absolute inset-[2px] bg-white rounded-3xl -z-10" />
                  
                  {/* Step number */}
                  <div className="text-7xl font-black bg-gradient-to-br from-gray-100 to-gray-50 bg-clip-text text-transparent absolute top-4 right-4 group-hover:from-purple-100 group-hover:to-pink-100 transition-all">
                    {item.step}
                  </div>

                  {/* Icon */}
                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradients[item.color as keyof typeof gradients]} p-3 mb-4 shadow-lg shadow-purple-500/20`}>
                    <Icon className="w-full h-full text-white" strokeWidth={2.5} />
                  </div>

                  {/* Step indicator */}
                  <div className="text-sm font-black bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent mb-2 uppercase tracking-wider">
                    {item.step}. {item.title}
                  </div>

                  {/* Description */}
                  <p className="text-content-faint text-sm leading-relaxed font-medium">
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