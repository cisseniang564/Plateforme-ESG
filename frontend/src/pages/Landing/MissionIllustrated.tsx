/**
 * Section « Notre objectif » — trois illustrations originales (SVG) qui racontent
 * ce que fait la plateforme : rassembler les données, les mesurer, en rendre compte.
 */
import { useState } from 'react';
import { ArrowRight, Wind, Sun, Hammer, Users, Briefcase, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const G = '#10b981';   // émeraude
const GD = '#047857';
const INK = '#0f172a';

/** 1 — Rassembler : des sources dispersées convergent vers un point unique. */
function IllustrationCollect() {
  const sources = [
    { x: 14, y: 28, label: 'Excel', c: '#16a34a' },
    { x: 14, y: 88, label: 'Factures', c: '#f59e0b' },
    { x: 14, y: 148, label: 'ERP / FEC', c: '#6366f1' },
    { x: 14, y: 208, label: 'RH', c: '#ec4899' },
  ];
  return (
    <svg viewBox="0 0 360 260" role="img" aria-label="Des sources de données dispersées réunies en une seule plateforme" className="w-full h-auto">
      <defs>
        <linearGradient id="mi-hub" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor={GD} />
        </linearGradient>
      </defs>
      {sources.map((s, i) => (
        <g key={s.label}>
          <path d={`M ${s.x + 104} ${s.y + 20} C 170 ${s.y + 20}, 170 130, 232 130`} fill="none" stroke={s.c} strokeOpacity="0.45" strokeWidth="2" strokeDasharray="5 5">
            <animate attributeName="stroke-dashoffset" from="20" to="0" dur={`${1.6 + i * 0.2}s`} repeatCount="indefinite" />
          </path>
          <rect x={s.x} y={s.y} width="104" height="40" rx="10" fill="#fff" stroke="#e2e8f0" />
          <rect x={s.x + 10} y={s.y + 11} width="18" height="18" rx="5" fill={s.c} fillOpacity="0.15" />
          <rect x={s.x + 14} y={s.y + 15} width="10" height="10" rx="2" fill={s.c} />
          <text x={s.x + 36} y={s.y + 25} fontSize="11" fontWeight="600" fill={INK}>{s.label}</text>
        </g>
      ))}
      <circle cx="268" cy="130" r="58" fill={G} fillOpacity="0.10" />
      <circle cx="268" cy="130" r="42" fill="url(#mi-hub)" />
      <path d="M268 108 c-12 0 -20 9 -20 20 c0 12 9 20 20 20 c3 0 6 -1 9 -2 c-10 -1 -17 -8 -17 -18 c0 -9 5 -16 14 -19 c-2 -1 -4 -1 -6 -1z" fill="#fff" fillOpacity="0.95" />
      <path d="M262 142 c8 -2 18 -10 22 -24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <text x="268" y="206" textAnchor="middle" fontSize="12" fontWeight="700" fill={GD}>Une seule source de vérité</text>
    </svg>
  );
}

/** 2 — Mesurer : score ESG, trajectoire carbone et indicateurs. */
function IllustrationMeasure() {
  const r = 46, circ = 2 * Math.PI * r, pct = 0.72;
  const bars = [38, 52, 44, 66, 58, 80];
  return (
    <svg viewBox="0 0 360 260" role="img" aria-label="Score ESG, évolution des émissions et indicateurs de performance" className="w-full h-auto">
      <rect x="12" y="14" width="336" height="232" rx="18" fill="#fff" stroke="#e2e8f0" />
      <g transform="translate(78 92)">
        <circle r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle r={r} fill="none" stroke={G} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90)" />
        <text y="6" textAnchor="middle" fontSize="26" fontWeight="800" fill={INK}>72</text>
        <text y="24" textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">SCORE ESG</text>
      </g>
      <text x="150" y="52" fontSize="11" fontWeight="700" fill={INK}>Émissions CO₂e</text>
      <text x="150" y="67" fontSize="10" fill="#64748b">trajectoire annuelle</text>
      {bars.map((h, i) => (
        <rect key={i} x={150 + i * 28} y={140 - h * 0.9} width="18" height={h * 0.9} rx="5"
          fill={i === bars.length - 1 ? G : '#a7f3d0'} />
      ))}
      <path d="M156 118 L184 108 L212 114 L240 92 L268 98 L296 76" fill="none" stroke={INK} strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 5" />
      {[['E', '#10b981', 0.8], ['S', '#6366f1', 0.64], ['G', '#f59e0b', 0.7]].map(([k, c, v], i) => (
        <g key={k as string} transform={`translate(${34 + i * 104} 178)`}>
          <circle r="11" cx="11" cy="11" fill={c as string} fillOpacity="0.15" />
          <text x="11" y="15" textAnchor="middle" fontSize="11" fontWeight="800" fill={c as string}>{k as string}</text>
          <rect x="30" y="7" width="58" height="8" rx="4" fill="#e2e8f0" />
          <rect x="30" y="7" width={58 * (v as number)} height="8" rx="4" fill={c as string} />
        </g>
      ))}
      <rect x="34" y="212" width="292" height="18" rx="9" fill={G} fillOpacity="0.10" />
      <text x="180" y="225" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={GD}>Objectif 2030 : −42 % — sur la bonne trajectoire</text>
    </svg>
  );
}

/** 3 — Rendre compte : rapport CSRD prêt, vérifié et partageable. */
function IllustrationReport() {
  return (
    <svg viewBox="0 0 360 260" role="img" aria-label="Rapport de durabilité CSRD généré, vérifié et prêt à être partagé" className="w-full h-auto">
      <rect x="70" y="26" width="170" height="214" rx="14" fill="#fff" stroke="#e2e8f0" transform="rotate(-5 155 133)" />
      <g>
        <rect x="104" y="20" width="176" height="220" rx="14" fill="#fff" stroke="#cbd5e1" />
        <rect x="120" y="38" width="64" height="9" rx="4.5" fill={INK} />
        <rect x="120" y="54" width="108" height="6" rx="3" fill="#cbd5e1" />
        <rect x="120" y="72" width="144" height="54" rx="9" fill={G} fillOpacity="0.10" />
        <rect x="132" y="104" width="12" height="14" rx="3" fill={G} fillOpacity="0.5" />
        <rect x="150" y="94" width="12" height="24" rx="3" fill={G} fillOpacity="0.7" />
        <rect x="168" y="84" width="12" height="34" rx="3" fill={G} />
        <rect x="200" y="86" width="52" height="6" rx="3" fill="#94a3b8" />
        <rect x="200" y="100" width="40" height="6" rx="3" fill="#cbd5e1" />
        {[142, 158, 174, 190, 206].map((y, i) => (
          <rect key={y} x="120" y={y} width={[144, 128, 140, 100, 122][i]} height="6" rx="3" fill="#e2e8f0" />
        ))}
        <rect x="120" y="216" width="72" height="14" rx="7" fill={INK} />
        <text x="156" y="226" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff">CSRD · ESRS</text>
      </g>
      <g transform="translate(262 150)">
        <circle r="38" fill={G} fillOpacity="0.12" />
        <circle r="28" fill={G} />
        <path d="M-12 1 L-3 10 L13 -8" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(30 60)">
        <rect width="86" height="26" rx="13" fill="#fff" stroke="#e2e8f0" />
        <circle cx="14" cy="13" r="5" fill="#6366f1" />
        <text x="26" y="17" fontSize="10" fontWeight="700" fill={INK}>Audit trail</text>
      </g>
      <g transform="translate(262 40)">
        <rect width="78" height="26" rx="13" fill="#fff" stroke="#e2e8f0" />
        <circle cx="14" cy="13" r="5" fill="#f59e0b" />
        <text x="26" y="17" fontSize="10" fontWeight="700" fill={INK}>PDF · XBRL</text>
      </g>
    </svg>
  );
}

/** Photo avec visuel de remplacement : si le fichier est absent, rien ne casse. */
function Photo({ src, alt, icon: Icon, className = '' }: { src: string; alt: string; icon: LucideIcon; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 ${className}`}>
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center" role="img" aria-label={alt}>
          <Icon className="h-1/3 w-1/3 text-emerald-600/40" strokeWidth={1.2} />
        </div>
      ) : (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}

/** Bandeau photos + chiffres (clés de la plateforme) en cercles, façon magazine. */
function PhotoBand() {
  const { t } = useTranslation();
  const facts = [
    { v: '22', l: t('landing.lp.photos.f1', 'modules intégrés dans une seule plateforme') },
    { v: '100+', l: t('landing.lp.photos.f2', 'indicateurs ESRS suivis') },
    { v: '10', l: t('landing.lp.photos.f3', 'référentiels couverts') },
  ];
  return (
    <div className="mt-20 grid items-center gap-8 lg:grid-cols-12">
      <div className="lg:col-span-3 order-2 lg:order-1">
        <p className="text-6xl font-extralight text-slate-900">{facts[0].v}</p>
        <p className="mt-2 text-gray-500">{facts[0].l}</p>
        <p className="mt-10 text-6xl font-extralight text-slate-900">{facts[1].v}</p>
        <p className="mt-2 text-gray-500">{facts[1].l}</p>
      </div>
      <div className="lg:col-span-6 order-1 lg:order-2 flex items-center justify-center gap-4 sm:gap-6">
        <Photo src="/landing/eolien.jpg" alt={t('landing.lp.photos.wind', 'Parc éolien en mer')} icon={Wind}
          className="h-40 w-40 sm:h-56 sm:w-56 rounded-full shadow-xl ring-8 ring-white" />
        <Photo src="/landing/solaire.jpg" alt={t('landing.lp.photos.solar', 'Champ de panneaux solaires')} icon={Sun}
          className="mt-16 h-32 w-32 sm:h-44 sm:w-44 rounded-full shadow-xl ring-8 ring-white" />
        <span className="hidden sm:block h-16 w-16 rounded-full bg-emerald-600/90" aria-hidden="true" />
      </div>
      <div className="lg:col-span-3 order-3">
        <p className="text-6xl font-extralight text-slate-900">{facts[2].v}</p>
        <p className="mt-2 text-gray-500">{facts[2].l}</p>
      </div>
    </div>
  );
}

/** Trois profils d'entreprise : la plateforme s'adapte à chacun. */
function ProfileCards() {
  const { t } = useTranslation();
  const profiles = [
    { src: '/landing/atelier.jpg', icon: Hammer, tag: 'PME',
      title: t('landing.lp.profiles.p1.title', 'PME sous pression de sa chaîne de valeur'),
      text: t('landing.lp.profiles.p1.text', 'Un grand client demande votre questionnaire de durabilité. Vous répondez une fois, avec des données que vous pouvez prouver.') },
    { src: '/landing/equipe.jpg', icon: Users, tag: 'ETI',
      title: t('landing.lp.profiles.p2.title', 'ETI qui doit publier en CSRD'),
      text: t('landing.lp.profiles.p2.text', 'Matérialité, ESRS, trajectoire carbone et rapport : une équipe réduite pilote tout au même endroit.') },
    { src: '/landing/cabinet.jpg', icon: Briefcase, tag: t('landing.lp.profiles.p3.tag', 'Cabinets'),
      title: t('landing.lp.profiles.p3.title', 'Cabinets qui accompagnent plusieurs clients'),
      text: t('landing.lp.profiles.p3.text', 'Un espace par client, des modèles de rapport réutilisables et une piste d’audit partagée avec les auditeurs.') },
  ];
  return (
    <div className="mt-24">
      <h3 className="mb-8 text-center text-2xl font-bold text-gray-900">
        {t('landing.lp.profiles.title', 'Conçu pour la réalité de chaque entreprise')}
      </h3>
      <div className="grid gap-6 md:grid-cols-3">
        {profiles.map(p => (
          <article key={p.tag} className="group overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="relative">
              <Photo src={p.src} alt={p.title} icon={p.icon} className="aspect-[4/3] w-full" />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800 backdrop-blur">{p.tag}</span>
            </div>
            <div className="p-6">
              <h4 className="mb-2 text-lg font-bold text-gray-900">{p.title}</h4>
              <p className="text-gray-500 leading-relaxed">{p.text}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function MissionIllustrated() {
  const { t } = useTranslation();
  const steps = [
    {
      n: '01',
      title: t('landing.lp.mission.s1.title', 'Rassemblez'),
      text: t('landing.lp.mission.s1.text', 'Excel, factures, ERP, FEC, RH : vos données dispersées arrivent au même endroit, sans ressaisie.'),
      art: <IllustrationCollect />,
    },
    {
      n: '02',
      title: t('landing.lp.mission.s2.title', 'Mesurez'),
      text: t('landing.lp.mission.s2.text', 'Score ESG, empreinte carbone, risques et matérialité se calculent automatiquement, avec une trajectoire claire.'),
      art: <IllustrationMeasure />,
    },
    {
      n: '03',
      title: t('landing.lp.mission.s3.title', 'Rendez compte'),
      text: t('landing.lp.mission.s3.text', 'Rapports CSRD / ESRS, DPEF et exports prêts à partager, avec une piste d’audit pour rassurer vos auditeurs.'),
      art: <IllustrationReport />,
    },
  ];

  return (
    <section id="objectif" className="relative py-24 bg-gradient-to-b from-white via-emerald-50/40 to-white overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-4">
            <span className="w-8 h-px bg-emerald-400 inline-block" />
            {t('landing.lp.mission.eyebrow', 'Notre objectif')}
            <span className="w-8 h-px bg-emerald-400 inline-block" />
          </span>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            {t('landing.lp.mission.title1', 'Transformer vos données')}
            <br />
            <span className="text-emerald-600">{t('landing.lp.mission.title2', 'en décisions durables')}</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t('landing.lp.mission.subtitle', 'La conformité ESG ne devrait pas être un projet à part. ESGFlow relie vos données du quotidien à vos obligations de reporting, en trois étapes.')}
          </p>
        </div>

        <div className="grid gap-8 lg:gap-6 lg:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="group h-full rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-100/60">
                <div className="mb-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 p-4">{s.art}</div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{s.n}</span>
                  <h3 className="text-xl font-bold text-gray-900">{s.title}</h3>
                </div>
                <p className="text-gray-500 leading-relaxed">{s.text}</p>
              </div>
              {i < steps.length - 1 && (
                <span className="hidden lg:flex absolute -right-5 top-1/3 z-10 h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100">
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
        </div>

        <PhotoBand />
        <ProfileCards />
      </div>
    </section>
  );
}
