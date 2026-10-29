interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** « dark » pour les bandeaux sombres (ex. en-tête du tableau de bord). */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

const TRACK = {
  light: 'bg-gray-100',
  dark: 'bg-white/10 border border-white/10',
};

const ACTIVE = {
  light: 'bg-white text-primary-700 shadow-sm',
  dark: 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30',
};

const IDLE = {
  light: 'text-gray-500 hover:text-gray-800',
  dark: 'text-white/50 hover:text-white/80 border border-transparent',
};

/** Choix unique parmi quelques options (7J / 30J / 90J / 1 an…). */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'light',
  size = 'md',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`inline-flex gap-0.5 p-1 rounded-xl ${TRACK[tone]}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${sizeClass} rounded-lg font-semibold transition-all ${o.value === value ? ACTIVE[tone] : IDLE[tone]}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
