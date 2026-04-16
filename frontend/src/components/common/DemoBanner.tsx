import { FlaskConical } from 'lucide-react';

interface Props {
  feature?: string;
}

export default function DemoBanner({ feature }: Props) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
      <FlaskConical className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <span>
        <strong>Données de démonstration</strong>
        {feature ? ` — ${feature}` : ''} · Cette fonctionnalité affiche des données simulées.
        La connexion aux données réelles sera disponible prochainement.
      </span>
    </div>
  );
}
