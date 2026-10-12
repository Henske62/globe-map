interface Props {
  value?: number;
  onChange?: (v: number | undefined) => void;
  size?: 'sm' | 'md';
}

export function StarRating({ value = 0, onChange, size = 'md' }: Props) {
  if (!onChange) {
    if (!value) return null;
    return (
      <span className={`stars stars-${size}`} aria-label={`${value} von 5 Sternen`}>
        {'★'.repeat(value)}
        <span className="stars-empty">{'★'.repeat(5 - value)}</span>
      </span>
    );
  }
  return (
    <span className={`stars stars-${size} stars-input`} role="radiogroup" aria-label="Bewertung">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} Sterne`}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(value === n ? undefined : n)}
        >
          ★
        </button>
      ))}
    </span>
  );
}
