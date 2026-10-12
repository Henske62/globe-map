import { useId, useState } from 'react';

interface Props {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

/** Freitext-Chips (Tags, Mitreisende) mit Vorschlägen aus bisherigen Einträgen. */
export function ChipInput({ label, values, onChange, suggestions = [], placeholder }: Props) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
  };
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chip-input">
        {values.map((v) => (
          <span key={v} className="chip">
            {v}
            <button type="button" aria-label={`${v} entfernen`} onClick={() => onChange(values.filter((x) => x !== v))}>
              ×
            </button>
          </span>
        ))}
        <input
          list={listId}
          value={text}
          placeholder={values.length ? '' : placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => text && add(text)}
        />
        <datalist id={listId}>
          {suggestions.filter((s) => !values.includes(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
