import { Volume2, VolumeX } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSound } from '@/lib/SoundContext';

export default function SoundToggle() {
  const { theme } = useTheme();
  const { enabled, setEnabled } = useSound();

  if (theme !== 'dark') return null;

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title={enabled ? 'Desativar sons ambiente' : 'Ativar sons ambiente'}
      aria-label={enabled ? 'Desativar sons ambiente' : 'Ativar sons ambiente'}
    >
      {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}