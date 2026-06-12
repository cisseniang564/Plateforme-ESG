"""
score_from_data_entries.py  — v2 (value-based scoring)
────────────────────────────────────────────────────────
Calcule les scores ESG depuis data_entries avec scoring RELATIF :
  - Chaque org est comparée aux autres du même tenant
  - Score = 40 pts complétude  +  60 pts valeurs normalisées
  - Métriques "plus bas = mieux" (émissions…) vs "plus haut = mieux"

Usage :
  python /app/scripts/score_from_data_entries.py
"""

import asyncio, sys, os, re
from datetime import date
from collections import defaultdict
from uuid import UUID

sys.path.insert(0, '/app')
os.environ.setdefault('PYTHONPATH', '/app')
import app.models  # noqa — initialise le registry SQLAlchemy

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.data_entry  import DataEntry
from app.models.esg_score   import ESGScore
from app.models.organization import Organization

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql+asyncpg://esguser:esgpassword@db:5432/esgplatform'
)

# ── Direction des métriques ────────────────────────────────────────────────────
# Mots-clés → "plus bas = mieux" (émissions, déchets, accidents…)
LOWER_IS_BETTER = [
    'émission', 'emission', 'co2', 'ghg', 'ges', 'scope', 'tco2', 'carbone',
    'combustion', 'déchet', 'dechet', 'accident', 'absentéisme', 'absenteisme',
    'turnover', 'rotation', 'litige', 'amende', 'sanction', 'incident',
    'violation', 'eau consommée', 'eau consomm', 'énergie consommée',
    'énergie non renouvelable', 'transport routier', 'fret aérien',
]

def is_lower_better(metric_name: str) -> bool:
    m = metric_name.lower()
    return any(kw in m for kw in LOWER_IS_BETTER)

# ── Pondération par pilier (total = 100) ──────────────────────────────────────
EXPECTED = {'environmental': 20, 'social': 10, 'governance': 8}
WEIGHTS  = {'environmental': 0.40, 'social': 0.35, 'governance': 0.25}
COMPL_PTS = 40.0   # pts de complétude (sur 100)
VALUE_PTS = 60.0   # pts de performance valeurs (sur 100)

def score_to_rating(s: float) -> str:
    if s >= 85: return 'AAA'
    if s >= 75: return 'AA'
    if s >= 65: return 'A'
    if s >= 55: return 'BBB'
    if s >= 45: return 'BB'
    if s >= 35: return 'B'
    if s >= 25: return 'CCC'
    if s >= 15: return 'CC'
    return 'C'

def normalize_values(values: list[float], lower_better: bool) -> list[float]:
    """Min-max normalize → 0-1, en inversant si lower_better."""
    if not values:
        return []
    mn, mx = min(values), max(values)
    if mx == mn:
        # Tous identiques : score médian (0.5) — même jeu de données
        return [0.5] * len(values)
    normed = [(v - mn) / (mx - mn) for v in values]
    if lower_better:
        normed = [1.0 - n for n in normed]
    return normed

async def compute_scores():
    engine  = create_async_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # ── Toutes les orgs ──────────────────────────────────────────────────
        orgs = (await db.execute(select(Organization))).scalars().all()
        org_by_id = {o.id: o for o in orgs}
        print(f"▶ {len(orgs)} organisations trouvées")

        # ── Toutes les data_entries en une requête ───────────────────────────
        entries_res = await db.execute(
            select(
                DataEntry.organization_id,
                DataEntry.pillar,
                DataEntry.metric_name,
                DataEntry.value_numeric,
            ).where(DataEntry.value_numeric.isnot(None))
        )
        all_entries = entries_res.fetchall()
        print(f"▶ {len(all_entries)} entrées numériques chargées")

        # ── Construire la matrice  metric_name → [(org_id, value)] ───────────
        # Structure : pillar → metric_name → {org_id: [values]}
        matrix: dict[str, dict[str, dict[UUID, list[float]]]] = defaultdict(
            lambda: defaultdict(lambda: defaultdict(list))
        )
        # Aussi : org_id → pillar → count
        org_pillar_count: dict[UUID, dict[str, int]] = defaultdict(lambda: defaultdict(int))

        for org_id, pillar, metric_name, value in all_entries:
            if org_id is None or pillar is None:
                continue
            matrix[pillar][metric_name][org_id].append(value)
            org_pillar_count[org_id][pillar] += 1

        # ── Pour chaque métrique, normaliser les valeurs entre orgs ──────────
        # Résultat : org_id → pillar → [normalized_score_0_to_1, ...]
        org_pillar_value_scores: dict[UUID, dict[str, list[float]]] = defaultdict(
            lambda: defaultdict(list)
        )

        for pillar, metrics in matrix.items():
            for metric_name, org_vals in metrics.items():
                if len(org_vals) < 2:
                    # Métrique présente chez une seule org → score médian
                    for oid in org_vals:
                        org_pillar_value_scores[oid][pillar].append(0.5)
                    continue

                org_ids  = list(org_vals.keys())
                # Agrégat par org : moyenne des valeurs multiples
                agg_vals = [sum(org_vals[oid]) / len(org_vals[oid]) for oid in org_ids]
                lower_b  = is_lower_better(metric_name)
                normed   = normalize_values(agg_vals, lower_b)

                for oid, ns in zip(org_ids, normed):
                    org_pillar_value_scores[oid][pillar].append(ns)

        # ── Calcul final des scores par org ───────────────────────────────────
        today   = date.today()
        created = updated = skipped = 0

        for org in orgs:
            oid   = org.id
            total_entries = sum(org_pillar_count[oid].values())
            if total_entries == 0:
                skipped += 1
                continue

            pillar_scores: dict[str, float] = {}

            for pillar, expected_count in EXPECTED.items():
                count = org_pillar_count[oid].get(pillar, 0)

                # 40 pts — complétude
                completeness_ratio = min(count / expected_count, 1.0)
                compl_score = completeness_ratio * COMPL_PTS

                # 60 pts — performance relative sur les valeurs
                val_list = org_pillar_value_scores[oid].get(pillar, [])
                if val_list:
                    avg_normalized = sum(val_list) / len(val_list)  # 0-1
                    val_score = avg_normalized * VALUE_PTS
                else:
                    val_score = VALUE_PTS * 0.4   # fallback si pas de valeurs

                pillar_scores[pillar] = round(compl_score + val_score, 2)

            E = pillar_scores.get('environmental', 0.0)
            S = pillar_scores.get('social',        0.0)
            G = pillar_scores.get('governance',    0.0)
            overall  = round(E * WEIGHTS['environmental'] + S * WEIGHTS['social'] + G * WEIGHTS['governance'], 2)
            compl_pct = round(min(total_entries / sum(EXPECTED.values()), 1.0) * 100, 2)
            rating   = score_to_rating(overall)

            # ── Upsert ───────────────────────────────────────────────────────
            ex = (await db.execute(
                select(ESGScore).where(
                    ESGScore.organization_id == oid,
                    ESGScore.calculation_date == today,
                )
            )).scalars().first()

            kwargs = dict(
                environmental_score = E,
                social_score        = S,
                governance_score    = G,
                overall_score       = overall,
                rating              = rating,
                data_completeness   = compl_pct,
                calculation_method  = 'relative_value_scoring',
                confidence_level    = 'high' if compl_pct >= 80 else 'medium',
                notes               = (
                    f"E:{E} S:{S} G:{G} | "
                    f"entries={total_entries} | "
                    f"value_metrics env={len(org_pillar_value_scores[oid].get('environmental',[]))} "
                    f"soc={len(org_pillar_value_scores[oid].get('social',[]))} "
                    f"gov={len(org_pillar_value_scores[oid].get('governance',[]))}"
                ),
            )

            if ex:
                for k, v in kwargs.items():
                    setattr(ex, k, v)
                updated += 1
            else:
                db.add(ESGScore(
                    organization_id=oid,
                    tenant_id=org.tenant_id,
                    calculation_date=today,
                    **kwargs,
                ))
                created += 1

            print(f"  {'✓':1s} {org.name[:38]:38s}  "
                  f"E={E:5.1f}  S={S:5.1f}  G={G:5.1f}  → {overall:5.1f} ({rating})")

        await db.commit()
        print(f"\n✅ Terminé : {created} créés, {updated} mis à jour, {skipped} ignorés (0 donnée)")

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(compute_scores())
