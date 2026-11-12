import { AlertTriangle, Loader2, ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  hint: string;
  errorLabel: string;
}

/**
 * Chek rasmi (MS-02): kichik ko'rinish → bosilsa to'liq ekran (brauzer pinch-zoom/pan).
 * Holatlar: yuklanmoqda, xato, tayyor.
 */
export function ImageViewer({ src, alt, hint, errorLabel }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [full, setFull] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => state === 'ready' && setFull(true)}
        className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-alt"
      >
        {state !== 'error' && (
          <img
            src={src}
            alt={alt}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
            className={`h-full w-full object-contain ${state === 'ready' ? '' : 'invisible'}`}
          />
        )}
        {state === 'loading' && (
          <Loader2 className="absolute size-8 animate-spin text-text-muted" aria-hidden />
        )}
        {state === 'error' && (
          <span className="flex flex-col items-center gap-1 text-sm text-danger">
            <AlertTriangle className="size-6" aria-hidden />
            {errorLabel}
          </span>
        )}
        {state === 'ready' && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            <ZoomIn className="size-3.5" aria-hidden />
            {hint}
          </span>
        )}
      </button>
      {full && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-30 overflow-auto bg-black"
          onClick={() => setFull(false)}
        >
          <img
            src={src}
            alt={alt}
            className="min-h-full w-full object-contain"
            style={{ touchAction: 'pinch-zoom' }}
          />
        </div>
      )}
    </>
  );
}
