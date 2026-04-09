import { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, TrendingDown, Sparkles } from 'lucide-react';
import { tokens } from '@/styles/tokens';
import { SectionHeader } from '@/app/components/shared/SectionHeader';

export function CostCalculator() {
  const [images, setImages] = useState(50);
  const [videos, setVideos] = useState(5);
  const [resolution, setResolution] = useState<'2K' | '4K'>('2K');

  // Pricing logic (Google API costs)
  const imageCost = resolution === '4K' ? 0.10 : 0.05; // per image
  const videoCost = 0.30; // average per video
  const conceptCost = 0.001; // negligible

  const totalImages = images * imageCost;
  const totalVideos = videos * videoCost;
  const totalConcepts = images * conceptCost; // assume 1 concept per image
  const totalMonthly = totalImages + totalVideos + totalConcepts;

  // Stock photo comparison
  const stockPhotoEquivalent = Math.floor(totalMonthly / 10); // $10 per stock photo average

  return (
    <section className="relative py-20 bg-gradient-to-b from-white via-blue-50/20 to-white">
      <div className="max-w-5xl mx-auto px-6">
        <SectionHeader
          badge="Cost Estimator"
          badgeIcon={Calculator}
          title={<>Estimate your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">monthly costs</span></>}
          subtitle="See how much you'd spend using your own Google API key"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={`p-8 ${tokens.radius.large} bg-white ${tokens.borders.card} ${tokens.shadows.card}`}
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-900">Images per month</label>
                  <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {images}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={images}
                  onChange={(e) => setImages(Number(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-fuchsia-600 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-xs text-content-muted mt-1 font-medium">
                  <span>10</span>
                  <span>500</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-900">Videos per month</label>
                  <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {videos}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={videos}
                  onChange={(e) => setVideos(Number(e.target.value))}
                  className="w-full h-3 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-fuchsia-600 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-xs text-content-muted mt-1 font-medium">
                  <span>0</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-900 mb-3 block">Image Resolution</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResolution('2K')}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                      resolution === '2K'
                        ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    2K
                  </button>
                  <button
                    onClick={() => setResolution('4K')}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                      resolution === '4K'
                        ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-gray-100 text-content-faint hover:bg-gray-200'
                    }`}
                  >
                    4K
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-black text-gray-900">Your Estimated Cost</h3>
              </div>

              {/* Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-content-faint font-medium">Images ({images} × €{imageCost.toFixed(2)})</span>
                  <span className="text-sm font-bold text-gray-900">€{totalImages.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-content-faint font-medium">Videos ({videos} × €{videoCost.toFixed(2)})</span>
                  <span className="text-sm font-bold text-gray-900">€{totalVideos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-content-faint font-medium">Concepts (included)</span>
                  <span className="text-sm font-bold text-gray-900">€{totalConcepts.toFixed(2)}</span>
                </div>
                <div className="h-px bg-purple-300 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-black text-gray-900">Total Monthly</span>
                  <span className="text-3xl font-black bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
                    €{totalMonthly.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Comparison */}
              <div className="bg-white rounded-xl p-4 border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-900 mb-1">Compared to Stock Photos</p>
                    <p className="text-xs text-content-faint leading-relaxed">
                      That's equivalent to <strong className="text-green-700">{stockPhotoEquivalent} stock photos</strong> at €10 each. 
                      <br />You're generating <strong className="text-purple-700">{images + videos} assets</strong> for less!
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <p className="text-xs text-content-faint mt-4 leading-relaxed">
                <strong>Note:</strong> These are Google API costs. fullydigital.pictures platform is free during beta.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}