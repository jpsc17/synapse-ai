import type { RelationshipCandidate } from '../types/synapse';

export type DiscoveryCategory = 'RECOMENDADA' | 'CANDIDATA' | 'EXPLORATORIA';

export interface CandidateFilterResult {
  readonly candidate: RelationshipCandidate;
  readonly category: DiscoveryCategory;
  readonly visible: boolean;
  readonly reasons: string[];
}

export const discoveryCategory = (candidate: RelationshipCandidate): DiscoveryCategory => {
  if (candidate.classificacao === 'CANDIDATO_RECOMENDADO') return 'RECOMENDADA';
  if (candidate.classificacao === 'CANDIDATO_AMBIGUO') return 'CANDIDATA';
  return 'EXPLORATORIA';
};

export const evaluateCandidateFilter = (
  candidate: RelationshipCandidate,
  minConfidence: number,
  onlyKeys: boolean,
): CandidateFilterResult => {
  const reasons: string[] = [];
  if (candidate.score < minConfidence) {
    reasons.push(`score ${candidate.score.toFixed(1)}% abaixo do mínimo de ${minConfidence}%`);
  }
  if (onlyKeys && candidate.classificacao === 'REJEITADO') {
    reasons.push('classificada pelo motor como exploratória, não como chave candidata');
  }
  return {
    candidate,
    category: discoveryCategory(candidate),
    visible: reasons.length === 0,
    reasons,
  };
};
