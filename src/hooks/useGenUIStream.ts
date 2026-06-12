import { useCallback, useRef, useState } from 'react';

import { API_BASE_URL } from '@/api/client';
import type { GenUINode, StreamStatus } from '@/lib/genui/renderer';
import { useAuthStore } from '@/store/auth';

// ── Mock sequences per strategy ──────────────────────────────────────────────
// Each inner array is one "chunk" delivered with a delay, simulating streaming.

const MOCK: Record<string, GenUINode[][]> = {
  safe: [
    [{ id: 's1', type: 'heading', props: { text: '稳妥新方案', icon: 'shield' } }],
    [{ id: 's2', type: 'subtext', props: { text: '今天气温适中，依然走通勤路线' } }],
    [{ id: 's3', type: 'reason', props: { text: '白衬衫配深色西裤，既正式又不失轻便，全套均在主衣柜可取。' } }],
    [{ id: 's4', type: 'tags', props: { items: ['主衣柜可取', '无需熨烫', '深浅对比'] } }],
    [{ id: 's5', type: 'tip', props: { text: '准备时间约 8 分钟' } }],
  ],
  fast: [
    [{ id: 'f1', type: 'heading', props: { text: '极速方案', icon: 'clock' } }],
    [{ id: 'f2', type: 'subtext', props: { text: '昨晚挂好，今天直接穿' } }],
    [{ id: 'f3', type: 'reason', props: { text: '针织衫 + 直筒牛仔裤，最近高频出现的搭配，拿起就走。' } }],
    [{ id: 'f4', type: 'tags', props: { items: ['免熨烫', '近期高频', '主衣柜'] } }],
    [{ id: 'f5', type: 'tip', props: { text: '准备时间约 4 分钟' } }],
  ],
  stylish: [
    [{ id: 'y1', type: 'heading', props: { text: '今日风格', icon: 'sparkle' } }],
    [{ id: 'y2', type: 'subtext', props: { text: '低饱和叠穿，细节制胜' } }],
    [{ id: 'y3', type: 'reason', props: { text: '米色外套叠咖色半裙，加一个同色系托特包，层次感不费力。' } }],
    [{ id: 'y4', type: 'tags', props: { items: ['含玄关托特包', '同色系叠穿', '低饱和'] } }],
    [{ id: 'y5', type: 'tip', props: { text: '准备时间约 13 分钟' } }],
  ],
};

const CHUNK_INTERVAL_MS = 380;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGenUIStream() {
  const [nodes, setNodes] = useState<GenUINode[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const mockTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bufferRef = useRef('');

  const reset = useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    mockTimersRef.current.forEach(clearTimeout);
    mockTimersRef.current = [];
    bufferRef.current = '';
    setNodes([]);
    setStatus('idle');
  }, []);

  // Simulates streaming delivery with timed chunks — no backend required.
  const startMock = useCallback(
    (variant: string) => {
      reset();
      setStatus('streaming');
      const chunks = MOCK[variant] ?? MOCK['safe'] ?? [];
      let delay = 160;
      chunks.forEach((batch) => {
        const t = setTimeout(() => {
          setNodes((prev) => [...prev, ...batch]);
        }, delay);
        mockTimersRef.current.push(t);
        delay += CHUNK_INTERVAL_MS;
      });
      const doneTimer = setTimeout(() => setStatus('done'), delay);
      mockTimersRef.current.push(doneTimer);
    },
    [reset],
  );

  // Real XHR streaming for when the backend exposes an NDJSON endpoint.
  // Each line must be a JSON-serialised GenUINode; stream ends with "[DONE]".
  const startStream = useCallback(
    (path: string, body: unknown) => {
      reset();
      setStatus('streaming');

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', `${API_BASE_URL}${path}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      const token = useAuthStore.getState().accessToken;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      let cursor = 0;
      xhr.onprogress = () => {
        const newText = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        bufferRef.current += newText;

        const lines = bufferRef.current.split('\n');
        bufferRef.current = lines.pop() ?? '';

        const parsed: GenUINode[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === '[DONE]') continue;
          try {
            parsed.push(JSON.parse(trimmed) as GenUINode);
          } catch {
            // malformed line — skip
          }
        }
        if (parsed.length) setNodes((prev) => [...prev, ...parsed]);
      };

      xhr.onload = () => setStatus('done');
      xhr.onerror = () => setStatus('error');
      xhr.send(JSON.stringify(body));
    },
    [reset],
  );

  return { nodes, status, startMock, startStream, reset };
}
