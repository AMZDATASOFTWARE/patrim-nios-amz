import { motion } from 'framer-motion';
import useScrollDraw from './useScrollDraw';

const cyan = 'var(--landing-cyan)';
const line = { fill: 'none', stroke: cyan, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

// Ativo (equipamento) sendo escaneado por QR, com circuitos de dados saindo dele.
export default function AssetScanSVG() {
  const { ref, pathLength, opacity } = useScrollDraw();
  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 560 220"
      style={{ width: '100%', maxWidth: 560, margin: '48px auto 0', display: 'block', opacity }}
      aria-hidden="true"
    >
      {/* Caixa do ativo */}
      <motion.rect x="220" y="60" width="120" height="100" rx="10" style={{ ...line, pathLength }} />
      {/* QR code dentro do ativo */}
      <motion.rect x="245" y="82" width="26" height="26" rx="4" style={{ ...line, pathLength }} />
      <motion.rect x="289" y="82" width="26" height="26" rx="4" style={{ ...line, pathLength }} />
      <motion.rect x="245" y="126" width="26" height="26" rx="4" style={{ ...line, pathLength }} />
      <motion.path d="M289 126 h12 v12 h14 v14 h-26 z" style={{ ...line, pathLength }} />
      {/* Feixe de scan */}
      <motion.line x1="232" y1="110" x2="328" y2="110" style={{ ...line, stroke: cyan, strokeWidth: 2, pathLength, opacity: 0.9 }} />
      {/* Circuitos saindo para a esquerda */}
      <motion.path d="M220 90 H160 V60 H110" style={{ ...line, pathLength, opacity: 0.7 }} />
      <motion.path d="M220 130 H150 V170 H100" style={{ ...line, pathLength, opacity: 0.7 }} />
      {/* Circuitos saindo para a direita */}
      <motion.path d="M340 90 H400 V50 H455" style={{ ...line, pathLength, opacity: 0.7 }} />
      <motion.path d="M340 130 H410 V175 H460" style={{ ...line, pathLength, opacity: 0.7 }} />
      {/* Nós dos circuitos */}
      {[[110, 60], [100, 170], [455, 50], [460, 175]].map(([cx, cy]) => (
        <motion.circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" style={{ ...line, pathLength }} />
      ))}
      {/* Etiquetas de dados */}
      <motion.rect x="60" y="48" width="42" height="24" rx="6" style={{ ...line, pathLength, opacity: 0.5 }} />
      <motion.rect x="468" y="163" width="42" height="24" rx="6" style={{ ...line, pathLength, opacity: 0.5 }} />
    </motion.svg>
  );
}