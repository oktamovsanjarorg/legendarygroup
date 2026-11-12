import { AlertTriangle, FileText, ImagePlus, Loader2 } from 'lucide-react';

/** FilePicker holatlari (design-system §3; yuklash — T-019 presigned oqimi). */
export type FilePickState =
  | { kind: 'empty' }
  | { kind: 'uploading'; name: string; percent: number }
  | { kind: 'ready'; name: string; previewUrl?: string }
  | { kind: 'error'; message: string };

interface Props {
  label: string;
  state: FilePickState;
  pickLabel: string;
  replaceLabel: string;
  uploadingLabel: string;
  onPick: () => void;
}

/** Chek/fayl tanlash: tanlanmagan → yuklanmoqda (progress) → tayyor (preview) / xato. */
export function FilePicker({
  label,
  state,
  pickLabel,
  replaceLabel,
  uploadingLabel,
  onPick,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-4 text-sm uppercase tracking-wide text-text-muted">{label}</span>
      <div className="overflow-hidden rounded-xl bg-bg">
        {state.kind === 'ready' && state.previewUrl && (
          <img
            src={state.previewUrl}
            alt={state.name}
            className="max-h-56 w-full object-contain bg-surface"
          />
        )}
        <button
          type="button"
          onClick={onPick}
          disabled={state.kind === 'uploading'}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-surface"
        >
          <PickIcon state={state} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className={`truncate text-base ${state.kind === 'empty' ? 'text-link' : 'text-text'}`}
            >
              {state.kind === 'empty'
                ? pickLabel
                : state.kind === 'error'
                  ? state.message
                  : state.name}
            </span>
            {state.kind === 'uploading' && (
              <span className="text-sm text-text-muted">
                {uploadingLabel.replace('{p}', String(state.percent))}
              </span>
            )}
          </span>
          {(state.kind === 'ready' || state.kind === 'error') && (
            <span className="text-sm font-medium text-link">{replaceLabel}</span>
          )}
        </button>
        {state.kind === 'uploading' && <ProgressBar percent={state.percent} />}
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-1 bg-surface"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

function PickIcon({ state }: { state: FilePickState }) {
  const c = 'size-6 shrink-0';
  if (state.kind === 'uploading')
    return <Loader2 className={`${c} animate-spin text-text-muted`} aria-hidden />;
  if (state.kind === 'error') return <AlertTriangle className={`${c} text-danger`} aria-hidden />;
  if (state.kind === 'ready') return <FileText className={`${c} text-success`} aria-hidden />;
  return <ImagePlus className={`${c} text-link`} aria-hidden />;
}
