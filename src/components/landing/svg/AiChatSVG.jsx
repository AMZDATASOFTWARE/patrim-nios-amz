import { motion } from 'framer-motion';
import useScrollDraw from './useScrollDraw';

const cyan = 'var(--landing-cyan)';
const line = { fill: 'none', stroke: cyan, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

// Smartphone com balões de conversa da IA e nós de rede — Squad no WhatsApp.
export default function AiChatSVG() {
  const { ref, pathLength, opacity } = useScrollDraw();
  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 260 220"
      style={{ width: '100%', maxWidth: 220, margin: '0 auto 16px', display: 'block', opacity }}
      aria-hidden="true"
    >
      {/* Smartphone */}
      <motion.rect x="90" y="30" width="80" height="160" rx="14" style={{ ...line, pathLength }} />
      <motion.line x1="118" y1="44" x2="142" y2="44" style={{ ...line, pathLength }} />
      {/* Balão recebido (IA) */}
      <motion.path d="M102 70 h44 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-34 l-10 8 z" style={{ ...line, pathLength }} />
      <motion.line x1="110" y1="81" x2="142" y2="81" style={{ ...line, pathLength, opacity: 0.6 }} />
      {/* Balão enviado (usuário) */}
      <motion.path d="M158 118 h-44 a6 6 0 0 0 -6 6 v12 a6 6 0 0 0 6 6 h34 l10 8 z" style={{ ...line, pathLength }} />
      <motion.line x1="116" y1="128" x2="150" y2="128" style={{ ...line, pathLength, opacity: 0.6 }} />
      {/* Faísca de IA no topo */}
      <motion.path d="M130 12 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" style={{ ...line, pathLength }} />
      {/* Nós de rede conectados ao celular */}
      <motion.path d="M90 100 H55 V70 H35" style={{ ...line, pathLength, opacity: 0.7 }} />
      <motion.path d="M170 100 H205 V140 H225" style={{ ...line, pathLength, opacity: 0.7 }} />
      <motion.circle cx="30" cy="70" r="5" style={{ ...line, pathLength }} />
      <motion.circle cx="230" cy="140" r="5" style={{ ...line, pathLength }} />
    </motion.svg>
  );
}