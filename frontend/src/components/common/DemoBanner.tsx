import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  feature?: string;
}

export default function DemoBanner({ feature }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
      <FlaskConical className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <span>
        <strong>{t('demoBanner.title')}</strong>
        {feature ? ` — ${feature}` : ''} · {t('demoBanner.desc')}
      </span>
    </div>
  );
}
