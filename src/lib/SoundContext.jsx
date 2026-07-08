import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { toast as sonnerToast } from 'sonner';

const SoundContext = createContext(null);

// ── Ponte sonner → eventos de som ──
// O app usa `toast` do sonner (não o shadcn use-toast). Interceptamos os métodos
// do sonner em nível de módulo para disparar um evento que o SoundProvider escuta.
const _originalToast = {};
const _patched = ['success', 'error', 'warning', 'info', 'message'];
for (const m of _patched) {
  if (typeof sonnerToast[m] === 'function') {
    _originalToast[m] = sonnerToast[m];
    const soundType = (m === 'error' || m === 'warning') ? 'error' : 'success';
    sonnerToast[m] = (...args) => {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: soundType } }));
      return _originalToast[m].apply(sonnerToast, args);
    };
  }
}

/**
 * Motor de sons ambientes procedurais (Web Audio API).
 * Gera "bolhas" e tons espaciais com eco — ativos apenas no tema dark.
 */
export function SoundProvider({ children, forceDark = false }) {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('sound-enabled') !== 'false'; } catch { return true; }
  });
  const ctxRef = useRef(null);
  const fxRef = useRef(null);

  const isDark = forceDark || theme === 'dark';
  const canPlay = enabled && isDark;

  useEffect(() => {
    try { localStorage.setItem('sound-enabled', String(enabled)); } catch {}
  }, [enabled]);

  // Inicializa AudioContext + cadeia de efeitos (delay/eco compartilhado)
  const ensureAudio = useCallback(() => {
    if (ctxRef.current) {
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      return ctxRef.current;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.18;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.22;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;

      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(master);

      ctxRef.current = ctx;
      fxRef.current = { master, delay, wet };
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // AudioContext só pode ser criado após interação do usuário
  useEffect(() => {
    const handler = () => ensureAudio();
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [ensureAudio]);

  // Movimento do cursor — zumbido tecnológico discreto e baixo
  const playBubble = useCallback(() => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200 + Math.random() * 800, now);

    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 8;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.0015, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(fx.master);

    osc.start(now);
    osc.stop(now + 0.035);
  }, [canPlay]);

  // Hover — blip suave e curto
  const playHover = useCallback(() => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(850 + Math.random() * 350, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.005, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(fx.master);
    gain.connect(fx.delay);

    osc.start(now);
    osc.stop(now + 0.07);
  }, [canPlay]);

  // Click — tom espacial mais grave com cauda de eco
  const playClick = useCallback(() => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.018, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(fx.master);
    gain.connect(fx.delay);

    osc.start(now);
    osc.stop(now + 0.29);
  }, [canPlay]);

  // Sucesso — acorde ascendente suave (< 1s)
  const playSuccess = useCallback(() => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const start = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.015, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(fx.master);
      gain.connect(fx.delay);
      osc.start(start);
      osc.stop(start + 0.31);
    });
  }, [canPlay]);

  // Erro — thud suave e grave
  const playError = useCallback(() => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);

    filter.type = 'lowpass';
    filter.frequency.value = 400;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(fx.master);

    osc.start(now);
    osc.stop(now + 0.36);
  }, [canPlay]);

  // Notificação — sino digital / gota sintetizada com eco
  const playNotify = useCallback(() => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.02, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(fx.master);
    gain.connect(fx.delay);

    osc.start(now);
    osc.stop(now + 0.41);
  }, [canPlay]);

  // Listeners globais — hover e click em elementos interativos
  useEffect(() => {
    if (!canPlay) return;

    let lastHover = 0;
    const onHover = (e) => {
      const now = Date.now();
      if (now - lastHover < 180) return;
      const el = e.target.closest?.('button, a, [role="button"], [role="switch"], input[type="checkbox"]');
      if (el) {
        lastHover = now;
        playHover();
      }
    };
    const onClick = (e) => {
      const el = e.target.closest?.('button, a, [role="button"]');
      if (el) playClick();
    };

    window.addEventListener('mouseover', onHover);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('mouseover', onHover);
      window.removeEventListener('click', onClick);
    };
  }, [canPlay, playHover, playClick]);

  // Listener de toasts — sucesso ou erro
  useEffect(() => {
    if (!canPlay) return;
    const onToast = (e) => {
      if (e.detail?.type === 'error') playError();
      else playSuccess();
    };
    window.addEventListener('app-toast', onToast);
    return () => window.removeEventListener('app-toast', onToast);
  }, [canPlay, playSuccess, playError]);

  return (
    <SoundContext.Provider value={{ enabled, setEnabled, canPlay, playBubble, playHover, playClick, playSuccess, playError, playNotify }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);