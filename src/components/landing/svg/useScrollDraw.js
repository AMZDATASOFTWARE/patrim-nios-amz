import { useRef } from 'react';
import { useScroll, useTransform } from 'framer-motion';

// Progresso de scroll da própria seção: os traços do SVG se "desenham"
// conforme o usuário desce a página (efeito scrollytelling).
export default function useScrollDraw(offset = ['start 92%', 'end 45%']) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  return { ref, progress: scrollYProgress, pathLength, opacity };
}