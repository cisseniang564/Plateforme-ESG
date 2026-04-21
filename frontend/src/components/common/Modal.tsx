import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 'sm' | 'md' | 'lg' | 'xl' | '2xl' */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const SIZE_MAP: Record<string, string> = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm modal-backdrop"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={[
          'relative bg-white rounded-2xl shadow-modal w-full',
          'flex flex-col max-h-[90vh] animate-scale-in',
          SIZE_MAP[size],
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#f0f4f8] flex-shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#f0f4f8] flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
