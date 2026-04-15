/**
 * BackButton — Bouton de navigation retour réutilisable.
 * Par défaut navigue vers la page précédente (navigate(-1)).
 * Peut recevoir un `to` explicite pour un retour ciblé.
 */
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  /** Route cible explicite (ex : "/app/data"). Par défaut : navigate(-1) */
  to?: string;
  /** Libellé affiché après la flèche. Par défaut : "Retour" */
  label?: string;
  className?: string;
}

export default function BackButton({ to, label = 'Retour', className = '' }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group ${className}`}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </button>
  );
}
