import { Sparkles, Zap, BookOpen, Code, Play, Save } from 'lucide-react';

export function ProWorkflowDocs() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-wider">PRO Feature</span>
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-4">
          PRO Workflow Builder Guide
        </h1>
        <p className="text-xl text-content-faint font-medium">
          Learn how to build powerful AI pipelines with visual node connections
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mb-12">
        <h2 className="text-lg font-black text-gray-900 mb-4">Quick Navigation</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <a href="#what-is-pro" className="text-sm font-bold text-purple-700 hover:text-purple-900">→ What is PRO Mode?</a>
          <a href="#getting-started" className="text-sm font-bold text-purple-700 hover:text-purple-900">→ Getting Started</a>
          <a href="#nodes" className="text-sm font-bold text-purple-700 hover:text-purple-900">→ Understanding Nodes</a>
          <a href="#connections" className="text-sm font-bold text-purple-700 hover:text-purple-900">→ Making Connections</a>
          <a href="#templates" className="text-sm font-bold text-purple-700 hover:text-purple-900">→ Template Library</a>
          <a href="#examples" className="text-sm font-bold text-purple-700 hover:text-purple-900">→ Real Examples</a>
        </div>
      </div>

      {/* Section 1: What is PRO? */}
      <section id="what-is-pro" className="mb-16">
        <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-purple-600" />
          What is PRO Workflow Builder?
        </h2>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-content-faint font-medium leading-relaxed mb-6">
            PRO Workflow Builder is a visual programming interface for creating complex AI automation pipelines. 
            Think of it like <strong>Figma for AI workflows</strong> - you drag nodes onto a canvas and connect 
            them to build custom processes.
          </p>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-black text-gray-900 mb-4">Simple vs. PRO Comparison</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-24 font-bold text-gray-900 flex-shrink-0">SIMPLE:</div>
                <div className="text-content-faint font-medium">
                  Click → Generate → Download. One step at a time. Perfect for quick tasks.
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-24 font-bold text-purple-900 flex-shrink-0">PRO:</div>
                <div className="text-content-faint font-medium">
                  Build → Connect → Automate. Create entire production pipelines. Save and reuse workflows.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-6">
            <h4 className="text-lg font-black text-gray-900 mb-3">When to Use PRO Mode?</h4>
            <ul className="space-y-2 text-sm font-medium text-content-faint">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">✓</span>
                <span>You need to repeat the same process multiple times</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">✓</span>
                <span>You want to chain multiple AI models together</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">✓</span>
                <span>You need batch processing (generate 10 variations at once)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">✓</span>
                <span>You want to save workflows as templates for your team</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Getting Started */}
      <section id="getting-started" className="mb-16">
        <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <Zap className="w-8 h-8 text-purple-600" />
          5-Minute Quick Start
        </h2>

        <div className="space-y-6">
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center">1</div>
              <h3 className="text-xl font-black text-gray-900">Load a Template</h3>
            </div>
            <p className="text-content-faint font-medium mb-4">
              Click the "Templates" button in the header. Choose "Full Concept Studio" to see a complete workflow.
            </p>
            <div className="bg-surface-inset rounded-xl p-4 overflow-x-auto">
              <pre className="text-purple-200 font-mono text-xs">
{`┌──────────┐      ┌──────────┐      ┌──────────┐
│ API Key  │─────▶│  Gemini  │─────▶│  Output  │
└──────────┘      └──────────┘      └──────────┘

3 nodes loaded automatically!`}
              </pre>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center">2</div>
              <h3 className="text-xl font-black text-gray-900">Configure the Gemini Node</h3>
            </div>
            <p className="text-content-faint font-medium mb-4">
              Click on the purple Gemini node. The right sidebar opens with all controls:
            </p>
            <ul className="space-y-2 text-sm font-medium text-content-faint ml-4">
              <li>• Select your model (Gemini Flash or Pro)</li>
              <li>• Choose goal type (Marketing, Social, etc.)</li>
              <li>• Upload an optional image reference</li>
              <li>• Write your prompt in the textarea</li>
            </ul>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black flex items-center justify-center">3</div>
              <h3 className="text-xl font-black text-gray-900">Run the Workflow</h3>
            </div>
            <p className="text-content-faint font-medium mb-4">
              Click the "Run Workflow" button. The system executes each node in sequence and displays results!
            </p>
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-600 font-black">✓</span>
              <span className="text-sm font-bold text-green-700">That's it! You just ran your first PRO workflow.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Understanding Nodes */}
      <section id="nodes" className="mb-16">
        <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <Code className="w-8 h-8 text-purple-600" />
          Understanding Nodes
        </h2>

        <p className="text-content-faint font-medium mb-6">
          Nodes are the building blocks of your workflow. Each node represents one action or process.
        </p>

        <div className="space-y-4">
          {/* Input Nodes */}
          <div className="bg-white border-2 border-blue-200 rounded-2xl p-6">
            <h3 className="text-lg font-black text-gray-900 mb-3">📥 INPUT NODES</h3>
            <p className="text-sm text-content-faint font-medium mb-4">These nodes provide data to your workflow</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-20 font-bold text-gray-900 flex-shrink-0 text-sm">API Key:</div>
                <div className="text-sm text-content-faint font-medium">Setup your Google API credentials (required first step)</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-20 font-bold text-gray-900 flex-shrink-0 text-sm">Prompt:</div>
                <div className="text-sm text-content-faint font-medium">Text input for AI generation</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-20 font-bold text-gray-900 flex-shrink-0 text-sm">Image:</div>
                <div className="text-sm text-content-faint font-medium">Upload reference images</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-20 font-bold text-gray-900 flex-shrink-0 text-sm">Style:</div>
                <div className="text-sm text-content-faint font-medium">Upload style references (up to 14)</div>
              </div>
            </div>
          </div>

          {/* Model Nodes */}
          <div className="bg-white border-2 border-purple-200 rounded-2xl p-6">
            <h3 className="text-lg font-black text-gray-900 mb-3">🤖 AI MODEL NODES</h3>
            <p className="text-sm text-content-faint font-medium mb-4">These nodes process data using AI</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Gemini Full:</div>
                <div className="text-sm text-content-faint font-medium">Complete CONCEPT tab - all controls for text generation</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Nano Banana Full:</div>
                <div className="text-sm text-content-faint font-medium">Complete IMAGE tab - all controls for image generation</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Veo Full:</div>
                <div className="text-sm text-content-faint font-medium">Complete VIDEO tab - all controls for video generation</div>
              </div>
            </div>
          </div>

          {/* Output Nodes */}
          <div className="bg-white border-2 border-green-200 rounded-2xl p-6">
            <h3 className="text-lg font-black text-gray-900 mb-3">📤 OUTPUT NODES</h3>
            <p className="text-sm text-content-faint font-medium mb-4">These nodes display or save results</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Text Output:</div>
                <div className="text-sm text-content-faint font-medium">Display generated text with copy/download buttons</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Image Preview:</div>
                <div className="text-sm text-content-faint font-medium">View generated images</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Video Preview:</div>
                <div className="text-sm text-content-faint font-medium">Watch generated videos</div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-32 font-bold text-gray-900 flex-shrink-0 text-sm">Download:</div>
                <div className="text-sm text-content-faint font-medium">Save outputs to your device</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Connections */}
      <section id="connections" className="mb-16">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Making Connections</h2>

        <p className="text-content-faint font-medium mb-6">
          Connections show how data flows through your workflow. They're color-coded by data type.
        </p>

        <div className="bg-surface-inset rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-black text-white mb-4">Connection Types</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: '#a855f7' }}></div>
              <span className="text-purple-200 font-bold text-sm">Purple = TEXT</span>
              <span className="text-content-secondary text-sm">(prompts, responses, descriptions)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: '#ec4899' }}></div>
              <span className="text-pink-200 font-bold text-sm">Pink = IMAGE</span>
              <span className="text-content-secondary text-sm">(photos, renders, artwork)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }}></div>
              <span className="text-blue-200 font-bold text-sm">Blue = VIDEO</span>
              <span className="text-content-secondary text-sm">(animations, clips, reels)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ background: '#eab308' }}></div>
              <span className="text-yellow-200 font-bold text-sm">Yellow = STYLE</span>
              <span className="text-content-secondary text-sm">(reference images, mood boards)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">Connection Rules</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-black mt-1">✓</span>
              <div>
                <div className="font-bold text-gray-900 mb-1">Valid: TEXT → TEXT</div>
                <div className="text-sm text-content-faint font-medium">Example: Prompt node → Gemini → Text Output</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-black mt-1">✓</span>
              <div>
                <div className="font-bold text-gray-900 mb-1">Valid: IMAGE → IMAGE</div>
                <div className="text-sm text-content-faint font-medium">Example: Imagen → Image Preview</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-600 font-black mt-1">✗</span>
              <div>
                <div className="font-bold text-gray-900 mb-1">Invalid: TEXT → IMAGE Preview</div>
                <div className="text-sm text-content-faint font-medium">Wrong type! Use Text Output instead</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Examples */}
      <section id="examples" className="mb-16">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Real-World Examples</h2>

        <div className="space-y-6">
          {/* Example 1 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h3 className="text-xl font-black text-gray-900 mb-3">📱 Social Media Campaign Factory</h3>
            <p className="text-content-faint font-medium mb-4">
              Generate campaign concept + matching visual + animated video
            </p>
            <div className="bg-surface-inset rounded-xl p-4 overflow-x-auto mb-4">
              <pre className="text-purple-200 font-mono text-xs">
{`┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ API Key │──▶│ Gemini  │──▶│ Imagen  │──▶│  Veo    │
└─────────┘   │Marketing│   │  2K     │   │ 1080p   │
              └─────────┘   └─────────┘   └─────────┘
                    │             │             │
                    ▼             ▼             ▼
                 [Copy]       [Preview]    [Download]

One prompt → Concept + Visual + Video`}
              </pre>
            </div>
            <div className="text-sm text-content-faint font-medium">
              <strong>Time saved:</strong> 8 hours → 15 minutes
            </div>
          </div>

          {/* Example 2 */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h3 className="text-xl font-black text-gray-900 mb-3">🛍️ E-commerce Product Launch</h3>
            <p className="text-content-faint font-medium mb-4">
              Product name → SEO description + 5 product photos + promo video
            </p>
            <div className="bg-surface-inset rounded-xl p-4 overflow-x-auto mb-4">
              <pre className="text-purple-200 font-mono text-xs">
{`                ┌─────────┐
                │ Product │
                │  Name   │
                └────┬────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │Gemini  │  │Imagen  │  │  Veo   │
   │  SEO   │  │  5x    │  │ Promo  │
   └────────┘  └────────┘  └────────┘

Complete product content set in 3 minutes`}
              </pre>
            </div>
            <div className="text-sm text-content-faint font-medium">
              <strong>Use case:</strong> Launch 50+ products/month
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Tips */}
      <section className="mb-16">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Pro Tips</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="font-black text-gray-900 mb-2">Start with Templates</h3>
            <p className="text-sm text-content-faint font-medium">
              Don't build from scratch. Load a template and modify it.
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-2xl mb-2">⌨️</div>
            <h3 className="font-black text-gray-900 mb-2">Keyboard Shortcuts</h3>
            <p className="text-sm text-content-faint font-medium">
              Press <kbd className="px-2 py-1 bg-white rounded border border-gray-300 font-bold">Delete</kbd> to remove selected nodes.
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-2xl mb-2">💾</div>
            <h3 className="font-black text-gray-900 mb-2">Save Your Work</h3>
            <p className="text-sm text-content-faint font-medium">
              Click "Save" to store workflows locally for reuse.
            </p>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
            <div className="text-2xl mb-2">🎨</div>
            <h3 className="font-black text-gray-900 mb-2">Collapse Nodes</h3>
            <p className="text-sm text-content-faint font-medium">
              Click the chevron icon to minimize nodes and save canvas space.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white">
        <h2 className="text-3xl font-black mb-4">Ready to Build?</h2>
        <p className="text-lg mb-6 text-purple-100 font-medium">
          Start creating powerful AI workflows today
        </p>
        <a
          href="#workflow-selection"
          className="inline-block px-8 py-4 rounded-xl bg-white text-purple-700 font-black text-lg hover:shadow-2xl transition-all"
        >
          Launch PRO Workflow Builder →
        </a>
      </div>
    </div>
  );
}
