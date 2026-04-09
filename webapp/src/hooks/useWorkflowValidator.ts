import { useState, useCallback } from 'react';
import type { WorkflowValidationReport } from '../types';

export function useWorkflowValidator() {
  const [report, setReport] = useState<WorkflowValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (workflow: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'validate_workflow',
          arguments: {
            workflow,
            customNodesDir: 'C:\\_AI\\ComfyUI_V81\\ComfyUI\\custom_nodes',
          },
        }),
      });
      if (!res.ok) throw new Error(`MCP error ${res.status}`);
      const data = await res.json();
      const text = data?.content?.[0]?.text ?? data;
      const parsed: WorkflowValidationReport =
        typeof text === 'string' ? JSON.parse(text) : text;
      setReport(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return { report, loading, error, validate, reset };
}
