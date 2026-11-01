import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, ShieldCheck, Share2, Fingerprint } from 'lucide-react';
import ReportHistoryPanel from '@/components/reports/ReportHistoryPanel';

/**
 * Liste des rapports générés : historique réel du compte (téléchargement, lien de partage,
 * invitation d'un auditeur, vérification d'intégrité par empreinte SHA-256).
 */
export default function ReportsList() {
  const { t } = useTranslation();

  const assurances = [
    { icon: Fingerprint, label: t('reportsHist.hash', 'Empreinte SHA-256 de chaque rapport') },
    { icon: ShieldCheck, label: t('reportsHist.verify', 'Vérification : les données ont-elles changé depuis ?') },
    { icon: Share2, label: t('reportsHist.share', 'Partage par lien temporaire, révocable') },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 40%, #065f46 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 15%, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
        <div className="relative flex flex-wrap items-start justify-between gap-6 px-8 py-7">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">{t('reportsHist.title', 'Rapports générés')}</h1>
            </div>
            <p className="mb-4 ml-1 text-sm text-emerald-100">
              {t('reportsHist.subtitle', 'Tous les rapports générés, avec leur version, leur empreinte et leurs liens de partage.')}
            </p>
            <ul className="flex flex-wrap items-center gap-2">
              {assurances.map(a => (
                <li key={a.label} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <a.icon className="h-3.5 w-3.5" aria-hidden="true" />{a.label}
                </li>
              ))}
            </ul>
          </div>
          <Link to="/app/reports/generate" className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-md transition-colors hover:bg-emerald-50">
            <Plus className="h-4 w-4" />{t('reports.generate', 'Générer un rapport')}
          </Link>
        </div>
      </div>

      <ReportHistoryPanel />
    </div>
  );
}
