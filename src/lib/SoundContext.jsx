import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';

const SoundContext = createContext(null);

/**
 * Motor de sons ambientes procedurais (Web Audio API).
 * Gera "bolhas" e tons espaciais com eco — ativos apenas no tema dark.
 */
export function SoundProvider({ children }) {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('sound-enabled') !== 'false'; } catch { return true; }
  });
  const ctxRef = useRef(null);
  const fxRef = useRef(null);

  const isDark = theme === 'dark';
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

  // Bolha — sine sweep curto com eco (interação cursor → partículas)
  const playBubble = useCallback((intensity = 0.5) => {
    if (!canPlay) return;
    const ctx = ctxRef.current;
    const fx = fxRef.current;
    if (!ctx || ctx.state !== 'running' || !fx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const base = 450 + Math.random() * 650;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * 0.55, now);
    osc.frequency.exponentialRampToValueAtTime(base, now + 0.045);

    filter.type = 'lowpass';
    filter.frequency.value = 2800;

    const vol = 0.01 + intensity * 0.02;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(fx.master);
    gain.connect(fx.delay);

    osc.start(now);
    osc.stop(now + 0.14);
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

  return (
    <SoundContext.Provider value={{ enabled, setEnabled, canPlay, playBubble, playHover, playClick }}>
      {children}
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);