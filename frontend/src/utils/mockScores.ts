/**
 * Génère des scores ESG cohérents basés sur l'ID de l'organisation
 * Les scores seront toujours les mêmes pour une organisation donnée
 */

// Simple hash function pour générer un nombre pseudo-aléatoire déterministe
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Générateur pseudo-aléatoire déterministe
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export interface ESGScores {
  overall: number;
  environmental: number;
  social: number;
  governance: number;
  rating: string;
  trend: number;
  data_completeness: number;
}

export function generateConsistentScores(orgId: string): ESGScores {
  const seed = hashString(orgId);
  
  // Utiliser le seed pour générer des valeurs déterministes
  const baseScore = 45 + seededRandom(seed) * 40; // 45-85
  
  const environmental = Math.round(baseScore + (seededRandom(seed + 1) - 0.5) * 15);
  const social = Math.round(baseScore + (seededRandom(seed + 2) - 0.5) * 12);
  const governance = Math.round(baseScore + (seededRandom(seed + 3) - 0.5) * 8);
  const overall = Math.round((environmental + social + governance) / 3);
  
  const rating = overall >= 75 ? 'AA' : 
                 overall >= 65 ? 'A' : 
                 overall >= 55 ? 'BBB' : 
                 overall >= 45 ? 'BB' : 'B';
  
  const trend = (seededRandom(seed + 4) - 0.4) * 8;
  const data_completeness = Math.round(75 + seededRandom(seed + 5) * 25);
  
  return {
    overall,
    environmental,
    social,
    governance,
    rating,
    trend,
    data_completeness
  };
}

export function generateEvolutionData(orgId: string, months: number = 12) {
  const seed = hashString(orgId);
  const scores = generateConsistentScores(orgId);
  
  return Array.from({ length: months }, (_, i) => {
    const monthSeed = seed + i * 100;
    return {
      month: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][i],
      overall: Math.max(0, Math.min(100, scores.overall + (seededRandom(monthSeed) - 0.5) * 8)),
      environmental: Math.max(0, Math.min(100, scores.environmental + (seededRandom(monthSeed + 1) - 0.5) * 10)),
      social: Math.max(0, Math.min(100, scores.social + (seededRandom(monthSeed + 2) - 0.5) * 10)),
      governance: Math.max(0, Math.min(100, scores.governance + (seededRandom(monthSeed + 3) - 0.5) * 10))
    };
  });
}

export function generateRadarData(orgId: string) {
  const seed = hashString(orgId);
  const scores = generateConsistentScores(orgId);
  
  const indicators = [
    'Émissions CO2',
    'Consommation eau',
    'Énergie renouvelable',
    'Satisfaction employés',
    'Formation',
    'Diversité',
    'Éthique',
    'Transparence'
  ];
  
  return indicators.map((subject, i) => ({
    subject,
    score: Math.max(0, Math.min(100, Math.round(scores.overall + (seededRandom(seed + i * 10) - 0.5) * 25))),
    fullMark: 100
  }));
}
