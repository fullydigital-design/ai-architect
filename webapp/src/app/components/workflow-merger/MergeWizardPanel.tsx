import { useState, useCallback, useRef } from 'react';
import { analyzeMerge, executeMerge } from '@/services/workflow-merger';
import type { MergeAnalysis, MergeResult, MergeStrategy } from '@/services/workflow-merger';

interface MergeWizardPanelProps {
  onLoadMergedWorkflow: (workflow: any, name: string) => void;
  onClose: () => void;
  currentWorkflow?: any;
  currentWorkflowName?: string;
}

type WizardStep = 'select' | 'review' | 'result';

const STEP_ORDER: WizardStep[] = ['select', 'review', 'result'];

export function MergeWizardPanel({
  onLoadMergedWorkflow,
  onClose,
  currentWorkflow,
  currentWorkflowName,
}: MergeWizardPanelProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [workflowA, setWorkflowA] = useState<any>(currentWorkflow || null);
  const [workflowB, setWorkflowB] = useState<any>(null);
  const [nameA, setNameA] = useState(currentWorkflowName || 'Workflow A');
  const [nameB, setNameB] = useState('Workflow B');
  const [analysis, setAnalysis] = useState<MergeAnalysis | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<MergeStrategy | null>(null);
  const [selectedBridges, setSelectedBridges] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    target: 'A' | 'B',
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const json = JSON.parse(String(loadEvent.target?.result || '{}'));
        const parsedName = file.name.replace(/\.json$/i, '').replace(/[_-]/g, ' ');
        if (target === 'A') {
          setWorkflowA(json);
          setNameA(parsedName);
        } else {
          setWorkflowB(json);
          setNameB(parsedName);
        }
        setError(null);
      } catch {
        setError(`Failed to parse ${file.name}. Please upload a valid ComfyUI workflow JSON file.`);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!workflowA || !workflowB) return;
    setAnalyzing(true);
    setError(null);

    setTimeout(() => {
      try {
        const nextAnalysis = analyzeMerge(workflowA, workflowB, nameA, nameB);
        setAnalysis(nextAnalysis);
        setSelectedStrategy(nextAnalysis.recommendedStrategy);
        setSelectedBridges(new Set(nextAnalysis.bridgePoints.slice(0, 5).map((bridge) => bridge.id)));
        setStep('review');
      } catch (err: any) {
        setError(`Analysis failed: ${err?.message || 'Unknown error'}`);
      } finally {
        setAnalyzing(false);
      }
    }, 25);
  }, [workflowA, workflowB, nameA, nameB]);

  const handleMerge = useCallback(() => {
    if (!analysis) return;
    setError(null);
    try {
      const bridges = analysis.bridgePoints.filter((bridge) => selectedBridges.has(bridge.id));
      const mergeResult = executeMerge(
        analysis,
        selectedStrategy || undefined,
        bridges.length > 0 ? bridges : undefined,
      );
      setResult(mergeResult);
      setStep('result');
    } catch (err: any) {
      setError(`Merge failed: ${err?.message || 'Unknown error'}`);
    }
  }, [analysis, selectedBridges, selectedStrategy]);

  const handleLoadResult = useCallback(() => {
    if (!result) return;
    onLoadMergedWorkflow(result.workflow, `Merged: ${nameA} + ${nameB}`);
    onClose();
  }, [result, onLoadMergedWorkflow, onClose, nameA, nameB]);

  const toggleBridge = useCallback((bridgeId: string) => {
    setSelectedBridges((prev) => {
      const next = new Set(prev);
      if (next.has(bridgeId)) next.delete(bridgeId);
      else next.add(bridgeId);
      return next;
    });
  }, []);

  const currentStepIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl m-auto max-h-[90vh] bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Workflow Merger</h1>
            <div className="flex items-center gap-1">
              {STEP_ORDER.map((wizardStep, index) => {
                const isActive = step === wizardStep;
                const isCompleted = currentStepIndex > index;
                return (
                  <div key={wizardStep} className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive || isCompleted ? 'bg-violet-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    {index < STEP_ORDER.length - 1 && (
                      <div className={`w-8 h-0.5 mx-0.5 ${currentStepIndex > index ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs border-b border-red-200 dark:border-red-900/50">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'select' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload two ComfyUI workflow JSON files. The merger analyzes node roles and type signatures to create a type-safe merge plan.
              </p>

              <div className={`rounded-xl border-2 border-dashed p-6 transition-colors ${workflowA
                ? 'border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-900/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Workflow A {workflowA && '(loaded)'}</h3>
                  {workflowA && <span className="text-xs text-gray-500 dark:text-gray-400">{nameA}</span>}
                </div>
                {workflowA ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {Array.isArray(workflowA?.nodes) ? workflowA.nodes.length : Object.keys(workflowA || {}).length} nodes
                    </span>
                    <button
                      onClick={() => fileInputARef.current?.click()}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputARef.current?.click()}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                    >
                      Upload JSON
                    </button>
                    {currentWorkflow && (
                      <button
                        onClick={() => {
                          setWorkflowA(currentWorkflow);
                          setNameA(currentWorkflowName || 'Current Workflow');
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-violet-400/50 dark:border-violet-500/50 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                      >
                        Use Current Workflow
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputARef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(event) => handleFileUpload(event, 'A')}
                />
              </div>

              <div className="flex justify-center text-gray-400 dark:text-gray-600 text-2xl">+</div>

              <div className={`rounded-xl border-2 border-dashed p-6 transition-colors ${workflowB
                ? 'border-violet-400 dark:border-violet-500 bg-violet-50/60 dark:bg-violet-900/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Workflow B {workflowB && '(loaded)'}</h3>
                  {workflowB && <span className="text-xs text-gray-500 dark:text-gray-400">{nameB}</span>}
                </div>
                {workflowB ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {Array.isArray(workflowB?.nodes) ? workflowB.nodes.length : Object.keys(workflowB || {}).length} nodes
                    </span>
                    <button
                      onClick={() => fileInputBRef.current?.click()}
                      className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputBRef.current?.click()}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                  >
                    Upload JSON
                  </button>
                )}
                <input
                  ref={fileInputBRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(event) => handleFileUpload(event, 'B')}
                />
              </div>
            </div>
          )}

          {step === 'review' && analysis && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-700/30 bg-violet-50 dark:bg-violet-900/10">
                <h3 className="text-violet-700 dark:text-violet-300 text-sm mb-1">Recommended Strategy</h3>
                <p className="text-gray-700 dark:text-gray-300 text-xs">{analysis.strategyExplanation}</p>

                <div className="flex items-center gap-2 mt-3">
                  {(['sequential', 'parallel', 'additive'] as MergeStrategy[]).map((strategyOption) => (
                    <button
                      key={strategyOption}
                      onClick={() => setSelectedStrategy(strategyOption)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        selectedStrategy === strategyOption
                          ? 'bg-violet-600 text-white border-violet-500'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      {strategyOption.charAt(0).toUpperCase() + strategyOption.slice(1)}
                      {strategyOption === analysis.recommendedStrategy ? ' *' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {analysis.bridgePoints.length > 0 && (
                <div>
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-2">
                    Bridge Points ({analysis.bridgePoints.length})
                  </h3>
                  <div className="space-y-1.5">
                    {analysis.bridgePoints.map((bridge) => (
                      <button
                        key={bridge.id}
                        onClick={() => toggleBridge(bridge.id)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                          selectedBridges.has(bridge.id)
                            ? 'border-violet-400/60 dark:border-violet-500/60 bg-violet-50 dark:bg-violet-900/10 text-violet-700 dark:text-violet-300'
                            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{bridge.description}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            bridge.priority >= 70
                              ? 'bg-green-500/15 text-green-700 border border-green-500/25 dark:text-green-400'
                              : bridge.priority >= 40
                                ? 'bg-amber-500/15 text-amber-700 border border-amber-500/25 dark:text-amber-400'
                                : 'bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                          }`}
                          >
                            {bridge.priority}%
                          </span>
                        </div>
                        {bridge.requiresConverter && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 block">
                            Auto-inserts {bridge.requiresConverter.classType}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {analysis.sharedResources.length > 0 && (
                <div>
                  <h3 className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-2">
                    Shared Resources ({analysis.sharedResources.length})
                  </h3>
                  <div className="space-y-1">
                    {analysis.sharedResources.map((shared, index) => (
                      <div key={`${shared.classType}-${index}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-100 dark:bg-gray-800/40 rounded-lg">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          shared.recommendation === 'keep-a'
                            ? 'bg-violet-500/15 text-violet-700 border border-violet-500/25 dark:text-violet-400'
                            : 'bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        }`}
                        >
                          {shared.recommendation === 'keep-a' ? 'Deduplicate' : 'Keep both'}
                        </span>
                        <span>{shared.classType}</span>
                        <span className="text-gray-500 dark:text-gray-500">- {shared.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.warnings.length > 0 && (
                <div>
                  <h3 className="text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider mb-2">Warnings</h3>
                  {analysis.warnings.map((warning, index) => (
                    <p key={`${warning}-${index}`} className="text-xs text-amber-700/90 dark:text-amber-300/80 mb-1">! {warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-green-200 dark:border-green-700/30 bg-green-50 dark:bg-green-900/10">
                <h3 className="text-green-700 dark:text-green-300 text-sm mb-2">Merge Complete</h3>
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{result.summary}</pre>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                <span>Total nodes: {result.graph.metadata.totalNodes}</span>
                <span>|</span>
                <span>Total connections: {result.graph.metadata.totalEdges}</span>
              </div>
              {result.warnings.length > 0 && (
                <div>
                  {result.warnings.map((warning, index) => (
                    <p key={`${warning}-${index}`} className="text-xs text-amber-700/90 dark:text-amber-300/80 mb-1">! {warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700/60">
          <div>
            {step !== 'select' && step !== 'result' && (
              <button
                onClick={() => setStep('select')}
                className="px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 'select' && (
              <button
                onClick={handleAnalyze}
                disabled={!workflowA || !workflowB || analyzing}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  workflowA && workflowB && !analyzing
                    ? 'bg-violet-600 text-white hover:bg-violet-500'
                    : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleMerge}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors"
              >
                Merge Workflows
              </button>
            )}
            {step === 'result' && (
              <button
                onClick={handleLoadResult}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Load Merged Workflow
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
