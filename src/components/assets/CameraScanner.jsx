import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff } from 'lucide-react';

// Leitor de QR / codigo de barras pela camera do navegador (item 1).
// Decodifica no proprio app (nao depende do app de camera nativo do celular).
// onDetected(text) e chamado a cada leitura; o chamador decide o que fazer.
export default function CameraScanner({ onDetected, onError }) {
  const containerId = useRef(`cam-scanner-${Math.floor(performance.now())}`);
  const scannerRef = useRef(null);
  const lastRef = useRef({ text: '', at: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(containerId.current, { verbose: false });
    scannerRef.current = scanner;

    const handle = (decodedText) => {
      // Debounce: a camera dispara o mesmo codigo varias vezes por segundo.
      const now = performance.now();
      if (decodedText === lastRef.current.text && now - lastRef.current.at < 1500) return;
      lastRef.current = { text: decodedText, at: now };
      onDetected(decodedText);
    };

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handle,
        () => { /* falha de leitura por frame — ignorada */ }
      )
      .catch((e) => {
        if (cancelled) return;
        const msg = 'Nao foi possivel acessar a camera. Verifique a permissao do navegador.';
        setError(msg);
        onError?.(e);
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => { try { s.clear(); } catch (_) { /* noop */ } });
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <CameraOff className="h-10 w-10 mb-2 opacity-60" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div id={containerId.current} className="w-full rounded-lg overflow-hidden bg-black/90 min-h-[240px]" />
      <p className="text-xs text-muted-foreground text-center">Aponte a câmera para o QR code ou código de barras do bem.</p>
    </div>
  );
}
