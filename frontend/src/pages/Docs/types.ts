/** Une page de la documentation = un article, rattaché à une ou plusieurs pages de la plateforme. */
export type SectionId =
  | 'demarrer' | 'collecter' | 'indicateurs' | 'carbone' | 'conformite' | 'rapports'
  | 'risques' | 'ia' | 'chaine' | 'audit' | 'organisations' | 'parametres' | 'partage';

/** Fonctions soumises au plan (même liste que dans la page Abonnement). */
export type FeatureKey =
  | 'csrd_report' | 'dpef_report' | 'carbon_report' | 'fec_import' | 'esrs_gap_analysis'
  | 'supply_chain_esg' | 'api_access' | 'data_export' | 'risk_register'
  | 'sfdr_report' | 'ai_narrative' | 'benchmark' | 'multi_standard';

export interface DocRoute { label: string; to: string }
export interface DocStep { title: string; text: string }

export interface DocArticle {
  slug: string;
  section: SectionId;
  title: string;
  /** Une phrase : à quoi sert la page. */
  summary: string;
  /** Pages de la plateforme décrites par cet article. */
  routes: DocRoute[];
  feature?: FeatureKey;
  about: string;
  /** Ce que l'on trouve sur la page. */
  shows: string[];
  steps?: DocStep[];
  tips?: string[];
  related?: string[];
  keywords?: string[];
}

export interface DocSection { id: SectionId; title: string; description: string }
