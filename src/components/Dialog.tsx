import { useEffect, useRef, useState } from 'react';

/**
 * Eigene Bestätigungsdialoge statt window.confirm/prompt – die sind in eingebetteten
 * Ansichten (z. B. als Claude-Artifact) gesperrt und sehen ohnehin überall anders aus.
 */
export interface DialogOption<T> {
  label: string;
  value: T;
  variant?: 'primary' | 'danger' | 'default';
}

interface DialogRequest {
  title: string;
  message?: string;
  options: DialogOption<unknown>[];
  /** Muss eingetippt werden, bevor gefährliche Optionen aktiv werden. */
  requireText?: string;
  resolve: (v: unknown) => void;
}

let push: ((r: DialogRequest) => void) | undefined;

export function choose<T>(opts: Omit<DialogRequest, 'resolve' | 'options'> & { options: DialogOption<T>[] }): Promise<T | null> {
  return new Promise((resolve) => {
    if (!push) return resolve(null);
    push({ ...opts, options: opts.options as DialogOption<unknown>[], resolve: resolve as (v: unknown) => void });
  });
}

export async function confirmDanger(title: string, message: string, confirmLabel = 'Löschen'): Promise<boolean> {
  return (await choose({ title, message, options: [{ label: confirmLabel, value: true, variant: 'danger' }] })) === true;
}

export function DialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    push = (r) => {
      setText('');
      setReq(r);
    };
    return () => {
      push = undefined;
    };
  }, []);

  useEffect(() => {
    if (!req) return;
    ref.current?.querySelector<HTMLElement>('input, .dialog-actions button:last-child')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]); // eslint-disable-line

  if (!req) return null;
  const close = (v: unknown) => {
    req.resolve(v);
    setReq(null);
  };
  const locked = !!req.requireText && text.trim() !== req.requireText;

  return (
    <div className="dialog-backdrop" onClick={() => close(null)}>
      <div className="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2 id="dialog-title">{req.title}</h2>
        {req.message && <p className="muted pre">{req.message}</p>}
        {req.requireText && (
          <div className="field">
            <label htmlFor="dialog-input">Zum Bestätigen „{req.requireText}“ eintippen</label>
            <input id="dialog-input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => close(null)}>
            Abbrechen
          </button>
          {req.options.map((o) => (
            <button
              key={o.label}
              type="button"
              className={`btn ${o.variant === 'danger' ? 'btn-danger-solid' : o.variant === 'primary' ? 'btn-primary' : ''}`}
              disabled={o.variant === 'danger' && locked}
              onClick={() => close(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
