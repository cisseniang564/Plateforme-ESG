import type { DocArticle, DocSection, FeatureKey } from '../types';
import { demarrer } from './demarrer';
import { collecter } from './collecter';
import { indicateurs } from './indicateurs';
import { carbone } from './carbone';
import { conformite } from './conformite';
import { rapports } from './rapports';
import { analyse } from './analyse';
import { gestion } from './gestion';
import { partage } from './partage';

export const SECTIONS: DocSection[] = [
  { id: 'demarrer', title: 'Démarrer', description: 'Tableau de bord, configuration de l\'espace et templates sectoriels.' },
  { id: 'collecter', title: 'Collecter les données', description: 'Saisie, imports, connecteurs, FEC, données RH et export.' },
  { id: 'indicateurs', title: 'Indicateurs, scores et qualité', description: 'Catalogue, scoring ESG, benchmarking, qualité et validation.' },
  { id: 'carbone', title: 'Carbone et climat', description: 'Bilan carbone, Scope 3, décarbonation, SBTi, ACV et scénarios.' },
  { id: 'conformite', title: 'Conformité et référentiels', description: 'CSRD, ESRS, SFDR, taxonomie, GRI, CDP, TCFD, CSDDD, iXBRL.' },
  { id: 'rapports', title: 'Rapports', description: 'Générer, planifier et exporter vos rapports.' },
  { id: 'risques', title: 'Matérialité, risques et parties prenantes', description: 'Double matérialité, registre des risques, enquêtes.' },
  { id: 'ia', title: 'Intelligence artificielle', description: 'Gaïa, assistant, prévisions et recommandations.' },
  { id: 'chaine', title: 'Chaîne de valeur', description: 'Évaluation des fournisseurs et plan de vigilance.' },
  { id: 'audit', title: 'Audit et traçabilité', description: 'Piste d\'audit et préparation de l\'audit CSRD.' },
  { id: 'organisations', title: 'Organisations et cabinets', description: 'Portefeuille, comparaison, consolidation et marque blanche.' },
  { id: 'parametres', title: 'Paramètres et compte', description: 'Utilisateurs, méthodologie, webhooks, intégrations, profil, abonnement et API.' },
  { id: 'partage', title: 'Pages publiques et liens partagés', description: 'Ce qui est ouvert à vos partenaires et au public.' },
];

export const ARTICLES: DocArticle[] = [
  ...demarrer, ...collecter, ...indicateurs, ...carbone, ...conformite,
  ...rapports, ...analyse, ...gestion, ...partage,
];

/** Plan minimal par fonction : même source que la page Abonnement (backend, FEATURE_MIN_PLAN). */
export const FEATURE_MIN_PLAN: Record<FeatureKey, string> = {
  csrd_report: 'PME', dpef_report: 'PME', carbon_report: 'PME', fec_import: 'PME',
  esrs_gap_analysis: 'PME', supply_chain_esg: 'PME', api_access: 'PME', data_export: 'PME', risk_register: 'PME',
  sfdr_report: 'ETI', ai_narrative: 'ETI', benchmark: 'ETI', multi_standard: 'ETI',
};

export const bySlug = (slug: string) => ARTICLES.find(a => a.slug === slug);
export const inSection = (id: string) => ARTICLES.filter(a => a.section === id);

/** Recherche simple : les mots de la requête doivent tous apparaître ; le titre compte plus que le texte. */
export function searchArticles(query: string): DocArticle[] {
  const words = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return [];
  const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ARTICLES
    .map(a => {
      const title = clean(a.title), summary = clean(a.summary), kw = clean((a.keywords ?? []).join(' '));
      const body = clean([a.about, ...a.shows, ...(a.steps ?? []).map(s => s.title + ' ' + s.text), ...(a.tips ?? [])].join(' '));
      let score = 0;
      for (const w of words) {
        const s = (title.includes(w) ? 8 : 0) + (kw.includes(w) ? 5 : 0) + (summary.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0);
        if (s === 0) return { a, score: 0 };
        score += s;
      }
      return { a, score };
    })
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map(x => x.a);
}
