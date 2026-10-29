import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** Texte explicatif sous le titre. */
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** « danger » pour une suppression, « primary » sinon. */
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Fenêtre de confirmation : remplace les petites modales refaites à la main dans chaque page. */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        {variant === 'danger' && (
          <div className="p-2.5 bg-red-50 rounded-xl h-fit">
            <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
        )}
        <div className="text-sm text-gray-600 leading-relaxed">{message}</div>
      </div>
    </Modal>
  );
}
