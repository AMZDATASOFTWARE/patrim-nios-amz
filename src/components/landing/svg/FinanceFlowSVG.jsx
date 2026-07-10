import { motion } from 'framer-motion';
import useScrollDraw from './useScrollDraw';

const cyan = 'var(--landing-cyan)';
const line = { fill: 'none', stroke: cyan, strokeLinecap: 'round', strokeLinejoin: 'round' };

// Gráfico patrimonial: barras crescendo + linha de tendência desenhada no scroll.
export default function FinanceFlowSVG() {
  const { ref, pathLength, opacity } = useScrollDraw();
  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 480 180"
      style={{ width: '100%', maxWidth: 480, margin: '0 auto 48px', display: 'block', opacity }}
      aria-hidden="true"
    >
      {/* Eixos */}
      <motion.path d="M60 20 V150 H430" style={{ ...line, strokeWidth: 1.5, pathLength, opacity: 0.5 }} />
      {/* Barras (desenham de baixo para cima) */}
      <motion.path d="M110 150 V110" style={{ ...line, strokeWidth: 22, pathLength, opacity: 0.35 }} />
      <motion.path d="M180 150 V90" style={{ ...line, strokeWidth: 22, pathLength, opacity: 0.45 }} />
      <motion.path d="M250 150 V70" style={{ ...line, strokeWidth: 22, pathLength, opacity: 0.55 }} />
      <motion.path d="M320 150 V55" style={{ ...line, strokeWidth: 22, pathLength, opacity: 0.65 }} />
      <motion.path d="M390 150 V38" style={{ ...line, strokeWidth: 22, pathLength, opacity: 0.75 }} />
      {/* Linha de tendência */}
      <motion.path
        d="M110 104 L180 84 L250 62 L320 48 L390 30"
        style={{ ...line, strokeWidth: 2.5, pathLength }}
      />
      {/* Ponto final da tendência */}
      <motion.circle cx="390" cy="30" r="6" style={{ ...line, strokeWidth: 2, pathLength }} />
      {/* Cifrão no destaque */}
      <motion.path d="M418 22 v-4 m0 20 v-4 m6 -10 a6 6 0 0 0 -6 -4 a5 5 0 0 0 0 10 a5 5 0 0 1 0 10 a6 6 0 0 1 -6 -4" style={{ ...line, strokeWidth: 1.5, pathLength, opacity: 0.8 }} />
    </motion.svg>
  );
}