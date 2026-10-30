import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

// Même apparence pour tous les champs : une seule définition.
const CONTROL = [
  'w-full rounded-xl border bg-white px-3.5 text-sm text-gray-900 placeholder:text-gray-400',
  'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
].join(' ');

const controlClass = (hasError: boolean, extra = '') =>
  `${CONTROL} ${hasError ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : 'border-gray-200'} ${extra}`;

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}

/** Libellé + champ + aide + message d'erreur. */
export function Field({ label, hint, error, required, htmlFor, children }: FieldShellProps) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface SharedProps { label?: string; hint?: string; error?: string }

// forwardRef : compatible avec react-hook-form (`{...register('nom')}`)
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & SharedProps>(
  ({ label, hint, error, required, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
        <input ref={ref} id={inputId} required={required} aria-invalid={!!error || undefined}
          className={controlClass(!!error, `h-10 ${className}`)} {...props} />
      </Field>
    );
  },
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & SharedProps>(
  ({ label, hint, error, required, className = '', id, children, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    return (
      <Field label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
        <select ref={ref} id={selectId} required={required} aria-invalid={!!error || undefined}
          className={controlClass(!!error, `h-10 ${className}`)} {...props}>
          {children}
        </select>
      </Field>
    );
  },
);
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & SharedProps>(
  ({ label, hint, error, required, className = '', id, rows = 4, ...props }, ref) => {
    const autoId = useId();
    const areaId = id ?? autoId;
    return (
      <Field label={label} hint={hint} error={error} required={required} htmlFor={areaId}>
        <textarea ref={ref} id={areaId} rows={rows} required={required} aria-invalid={!!error || undefined}
          className={controlClass(!!error, `py-2.5 ${className}`)} {...props} />
      </Field>
    );
  },
);
Textarea.displayName = 'Textarea';
