import { useState, useEffect } from 'react';
import { getObjectInfo } from '../../services/comfyui-object-info-cache';

interface ScannerStatus {
  status: 'loading' | 'success' | 'error';
  totalNodes: number;
  checkpoints: string[];
  loras: string[];
  vaes: string[];
  samplers: string[];
  schedulers: string[];
  error?: string;
  responseSize?: number;
}

export function DebugBanner({ comfyUrl }: { comfyUrl: string }) {
  const [info, setInfo] = useState<ScannerStatus>({
    status: 'loading',
    totalNodes: 0,
    checkpoints: [],
    loras: [],
    vaes: [],
    samplers: [],
    schedulers: [],
  });

  useEffect(() => {
    async function scan() {
      try {
        const data = await getObjectInfo(comfyUrl);
        const text = JSON.stringify(data);
        const totalNodes = Object.keys(data).length;

        const extract = (node: string, field: string): string[] => {
          try {
            const val = data[node]?.input?.required?.[field];
            if (Array.isArray(val) && Array.isArray(val[0])) return val[0];
            return [];
          } catch {
            return [];
          }
        };

        setInfo({
          status: 'success',
          totalNodes,
          checkpoints: extract('CheckpointLoaderSimple', 'ckpt_name'),
          loras: extract('LoraLoader', 'lora_name'),
          vaes: extract('VAELoader', 'vae_name'),
          samplers: extract('KSampler', 'sampler_name'),
          schedulers: extract('KSampler', 'scheduler'),
          responseSize: text.length,
        });
      } catch (err: any) {
        setInfo(prev => ({
          ...prev,
          status: 'error',
          error: err.message || 'Unknown error',
        }));
      }
    }

    scan();
  }, [comfyUrl]);

  const bgColor =
    info.status === 'loading' ? '#1a1a2e' :
    info.status === 'error' ? '#4a1010' :
    (info.totalNodes >= 1900 && info.checkpoints.length >= 2) ? '#0a3a0a' : '#3a3a0a';

  return (
    <div
      style={{
        background: bgColor,
        color: '#fff',
        padding: '8px 16px',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 'bold' }}>
        [DEBUG SCANNER]
      </span>

      {info.status === 'loading' && <span>Scanning /object_info...</span>}

      {info.status === 'error' && (
        <span style={{ color: '#ff6666' }}>ERROR: {info.error}</span>
      )}

      {info.status === 'success' && (
        <>
          <span>
            Nodes: <b style={{ color: info.totalNodes >= 1900 ? '#66ff66' : '#ff6666' }}>
              {info.totalNodes}
            </b>
            {info.totalNodes >= 1900 ? ' [OK]' : ' [X] (expected ~1954)'}
          </span>
          <span>
            Checkpoints: <b style={{ color: info.checkpoints.length >= 2 ? '#66ff66' : '#ff6666' }}>
              {info.checkpoints.length}
            </b>
            {info.checkpoints.length > 0 && (
              <span style={{ color: '#aaa' }}> [{info.checkpoints.join(', ')}]</span>
            )}
          </span>
          <span>LoRAs: <b>{info.loras.length}</b></span>
          <span>VAEs: <b>{info.vaes.length}</b></span>
          <span>Samplers: <b>{info.samplers.length}</b></span>
          <span>Schedulers: <b>{info.schedulers.length}</b></span>
          <span style={{ color: '#888' }}>
            Response: {((info.responseSize || 0) / 1024 / 1024).toFixed(1)}MB
          </span>
        </>
      )}

      <span style={{ marginLeft: 'auto', color: '#666', fontSize: '10px' }}>
        (temporary - remove after verification)
      </span>
    </div>
  );
}
