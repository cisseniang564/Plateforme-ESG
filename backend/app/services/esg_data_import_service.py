"""
ESG Data Import Service - Import CSV/Excel to data_entries table.
"""
import io
import logging
from typing import Any, Optional
from uuid import UUID
from datetime import datetime, date

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.data_upload import DataUpload
from app.models.data_entry import DataEntry
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.audit_log import AuditLog
from app.models.materiality import MaterialityIssue, ESGRisk
from app.models.supplier import Supplier
from app.services.audit_service import log_change

logger = logging.getLogger(__name__)


class ESGDataImportService:
    """Service for importing ESG data to data_entries.

    Supports a wide variety of column-naming conventions out-of-the-box
    (French / English, GHG inventories, FEC accounting, ESRS tables,
    energy / water / waste / workforce sheets). When the standard
    ``Indicateur`` / ``Valeur`` columns are missing, the service falls back
    to *inference*:

    * ``tco2e`` / ``kgco2e`` columns → ``value_numeric`` (+ unit = tCO2e)
    * ``kwh`` / ``mwh`` columns      → ``value_numeric`` (+ unit, category=energy)
    * ``scope`` + ``category`` + ``source`` triple → composite ``metric_name``
    * ``ESRS code`` (E1-1, S1-2…) → metric_name
    """

    # Each target column lists the *normalised* aliases it accepts (lowercased,
    # accents stripped, spaces / dashes / dots collapsed to ``_``).
    COLUMN_MAPPINGS: dict[str, list[str]] = {
        # ── Pillar (E / S / G) ────────────────────────────────────────────
        'pillar': [
            'pillar', 'pilier', 'esg_pillar', 'pillar_esg',
            'type', 'type_esg', 'axe', 'axe_esg', 'domaine', 'domain',
            'theme', 'thematique', 'theme_esg', 'esrs_pillar',
        ],
        # ── Category / subcategory ────────────────────────────────────────
        'category': [
            'category', 'categorie', 'subcategory', 'sous_categorie',
            'sous_categorie', 'thematique', 'topic', 'sub_topic', 'subtopic',
            'sous_theme', 'esrs_topic', 'topic_esrs', 'sub_pillar',
        ],
        # ── Indicator / metric name ───────────────────────────────────────
        'metric_name': [
            'metric_name', 'metric', 'indicator', 'indicateur', 'indicateurs',
            'name', 'nom', 'libelle', 'label', 'kpi', 'kpi_name',
            'esrs_code', 'esrs', 'esrs_id', 'code', 'code_esrs',
            'code_indicateur', 'indicator_code', 'reference',
            'gri', 'gri_code', 'sasb_code', 'tcfd_code',
            'indicateur_libelle', 'libelle_indicateur', 'descriptif',
            # Materiality / risks
            'enjeu', 'topic_name', 'risk', 'risque', 'risk_name',
            'opportunity', 'opportunite', 'title', 'titre',
            # Suppliers
            'supplier_name', 'nom_fournisseur', 'fournisseur',
        ],
        # ── Value (numeric) ───────────────────────────────────────────────
        'value_numeric': [
            'value_numeric', 'value', 'valeur', 'amount', 'montant',
            'numeric_value', 'score', 'quantity', 'quantite', 'qte',
            'nombre', 'count', 'total', 'sum', 'somme',
            # GHG emissions (tons / kg CO2-equivalent)
            'tco2e', 'tco2', 'tonnes_co2', 'tonnes_co2e', 't_co2e',
            'kgco2e', 'kgco2', 'kg_co2', 'kg_co2e',
            'co2e', 'co2_eq', 'co2equivalent', 'emissions', 'emission',
            'ges', 'ghg', 'ghg_emissions',
            # Energy
            'kwh', 'mwh', 'gwh', 'tep', 'gj', 'mj',
            'consommation', 'consommation_energie', 'energy',
            # Water / waste
            'm3', 'litres', 'l',
            'tonnes', 'kg', 'poids',
            # FEC (accounting)
            'montant_credit', 'montant_debit', 'credit', 'debit',
            # Supplier scoring (put BEFORE risk fields so suppliers/global_score wins
            # over `risk_level` which is categorical)
            'global_score', 'esg_score', 'overall_score', 'rating',
            'e_score', 's_score', 'g_score',
            'environment_score', 'social_score', 'governance_score',
            # Materiality (double-materiality scoring 0-100)
            'financial_impact', 'esg_impact', 'impact_financier', 'impact_esg',
            'impact_score', 'materiality_score', 'score_materialite',
            'business_impact', 'environmental_impact', 'impact',
            # Risks (likelihood × severity — numeric only; risk_level/impact_level
            # are categorical ("low"/"medium"/"high") and intentionally excluded)
            'severity', 'gravite', 'gravity',
            'likelihood', 'probabilite', 'probability',
            'risk_score', 'inherent_risk', 'residual_risk',
            # Monetary
            'annual_spend_eur', 'annual_spend', 'spend', 'depense', 'depenses',
            'revenue', 'chiffre_affaires', 'ca', 'turnover',
            'price', 'prix', 'cost', 'cout',
            # Workforce / HR
            'etp', 'fte', 'headcount', 'effectif', 'effectifs',
            'salaries', 'employees', 'nb_salaries', 'nb_employees',
            'hours', 'heures',
        ],
        # ── Unit ─────────────────────────────────────────────────────────
        'unit': [
            'unit', 'unite', 'units', 'unite_mesure', 'unit_of_measure',
            'mesure', 'uom',
        ],
        # ── Period start ──────────────────────────────────────────────────
        'period_start': [
            'period_start', 'date_start', 'start_date', 'date_debut',
            'debut', 'date_de_debut', 'from', 'de',
            'date', 'date_ecriture',  # FEC
            'annee', 'year', 'exercice', 'periode', 'period',
        ],
        # ── Period end ────────────────────────────────────────────────────
        'period_end': [
            'period_end', 'date_end', 'end_date', 'date_fin',
            'fin', 'date_de_fin', 'to', 'au', 'jusqu_au',
        ],
        # ── Data source ───────────────────────────────────────────────────
        'data_source': [
            'data_source', 'source', 'origine', 'origin',
            'fournisseur_donnee', 'data_origin', 'provenance',
            'reference', 'ref',
            'calculation_method', 'methode_calcul', 'methodology',
        ],
        # ── Notes ─────────────────────────────────────────────────────────
        'notes': [
            'notes', 'comments', 'commentaires', 'commentaire',
            'description', 'desc', 'remarques', 'remarque', 'observations',
            'libelle_ecriture',  # FEC
        ],
        # ── Organization (optional — for multi-org files) ─────────────────
        'organization': [
            'organization', 'organisation', 'org', 'entite', 'entity',
            'societe', 'company', 'filiale', 'site', 'business_unit', 'bu',
        ],
    }

    # ── Composite-metric trigger columns ──────────────────────────────────
    # If the file has ANY of these columns and no explicit metric_name, we
    # build a composite name like "Scope 1 / Combustion / Gaz" from them.
    METRIC_COMPONENTS: list[str] = [
        'scope', 'scope_ghg', 'ghg_scope',
        'category', 'categorie',
        'source', 'activity', 'activite',
        'sub_category', 'sous_categorie',
        'esrs_code', 'esrs',
    ]

    # ── Unit inference from column names ──────────────────────────────────
    UNIT_BY_COLUMN: dict[str, str] = {
        'tco2e': 'tCO2e', 'tco2': 'tCO2', 't_co2e': 'tCO2e',
        'tonnes_co2': 'tCO2', 'tonnes_co2e': 'tCO2e',
        'kgco2e': 'kgCO2e', 'kgco2': 'kgCO2', 'kg_co2': 'kgCO2', 'kg_co2e': 'kgCO2e',
        'co2e': 'tCO2e', 'ges': 'tCO2e', 'ghg_emissions': 'tCO2e',
        'kwh': 'kWh', 'mwh': 'MWh', 'gwh': 'GWh',
        'tep': 'TEP', 'gj': 'GJ', 'mj': 'MJ',
        'm3': 'm³', 'litres': 'L', 'l': 'L',
        'tonnes': 't', 'kg': 'kg', 'poids': 'kg',
    }

    # ── Pillar inference from column / file context ───────────────────────
    PILLAR_HINTS: dict[str, str] = {
        # Environmental signals
        'tco2e': 'environmental', 'co2': 'environmental', 'ges': 'environmental',
        'emissions': 'environmental', 'scope': 'environmental',
        'energie': 'environmental', 'energy': 'environmental',
        'eau': 'environmental', 'water': 'environmental',
        'dechets': 'environmental', 'waste': 'environmental',
        # Social signals
        'employee': 'social', 'employes': 'social', 'salarie': 'social',
        'etp': 'social', 'headcount': 'social', 'effectif': 'social',
        'formation': 'social', 'training': 'social',
        'diversite': 'social', 'diversity': 'social', 'gender': 'social',
        'accident': 'social', 'security': 'social', 'sst': 'social',
        # Governance signals
        'governance': 'governance', 'gouvernance': 'governance',
        'audit': 'governance', 'compliance': 'governance', 'conformite': 'governance',
        'ethics': 'governance', 'ethique': 'governance',
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Column-name normalisation ─────────────────────────────────────────
    @staticmethod
    def _normalize_col(col: str) -> str:
        """Lowercase, strip accents, replace separators with underscores."""
        import unicodedata, re
        if col is None:
            return ''
        # Strip accents
        norm = unicodedata.normalize('NFKD', str(col))
        norm = ''.join(c for c in norm if not unicodedata.combining(c))
        # Lowercase + replace any run of non-alphanum with underscore
        norm = re.sub(r'[^a-z0-9]+', '_', norm.lower()).strip('_')
        return norm
    
    async def parse_and_preview(
        self,
        file_content: bytes,
        filename: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> DataUpload:
        """Parse CSV/Excel and create preview."""

        # Set created_at / updated_at Python-side so we don't depend on the
        # server-default NOW() (which would force a refresh-after-INSERT
        # round-trip that fails with greenlet_spawn if it tries to lazy-load
        # the attribute later when the response is being serialised).
        _now = datetime.utcnow()
        upload = DataUpload(
            tenant_id=tenant_id,
            uploaded_by=user_id,
            filename=filename,
            file_size=len(file_content),
            file_type=self._detect_file_type(filename),
            status="processing",
            processing_started_at=_now,
            created_at=_now,
            updated_at=_now,
        )
        self.db.add(upload)
        await self.db.flush()
        
        try:
            if filename.endswith('.csv'):
                df = self._read_csv_robust(file_content)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            detected_mapping = self._auto_detect_columns(df.columns.tolist())

            total_rows = len(df)
            all_rows = self._clean_nan(df.to_dict('records'))   # ← toutes les lignes
            preview = all_rows[:10]                              # ← 10 premières pour l'UI

            validation_result = self._validate_for_import(df, detected_mapping)

            upload.total_rows = total_rows
            upload.valid_rows = validation_result['valid_count']
            upload.invalid_rows = validation_result['invalid_count']
            upload.data_preview = preview
            upload.validation_errors = validation_result['errors']
            upload.file_metadata = {
                'columns': list(df.columns),
                'detected_mapping': detected_mapping,
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'all_rows': all_rows,   # ← stockage complet pour l'import réel
            }
            upload.status = "completed"
            upload.processing_completed_at = datetime.utcnow()
            
        except Exception as e:
            upload.status = "failed"
            upload.error_message = str(e)
            upload.processing_completed_at = datetime.utcnow()
        
        await self.db.commit()
        # NOTE: we do NOT call ``await self.db.refresh(upload)`` here.
        # ``refresh()`` first *expires* the instance's attributes, then issues
        # a SELECT to reload them. If that SELECT fails for any reason (RLS,
        # connection issue), the attributes stay expired — and the caller
        # accessing ``upload.status`` later raises MissingGreenlet because
        # SQLAlchemy tries to lazy-load synchronously inside an async context.
        # All attributes we care about (status, created_at, …) are already
        # set Python-side, so a refresh adds nothing here.
        return upload

    # ── File-intent classifier ────────────────────────────────────────────
    # Looks at the column names to decide whether a file is a materiality
    # assessment, a risk register, a supplier list, or a generic ESG
    # indicators / GHG table. Drives the dispatch in ``import_to_data_entries``
    # so each file lands in the table the UI actually reads from.
    @classmethod
    def _detect_file_intent(cls, columns: list[str]) -> str:
        """Return one of: 'materiality' | 'risks' | 'suppliers' | 'generic'."""
        norm = {cls._normalize_col(c) for c in columns}

        # Materiality: double-materiality scoring fields
        materiality_signals = norm & {
            'financial_impact', 'esg_impact', 'is_material',
            'impact_financier', 'impact_esg', 'materielle',
            'materiality_score', 'priority',
        }
        if len(materiality_signals) >= 2 and (norm & {'name', 'nom', 'enjeu', 'topic_name'}):
            return 'materiality'

        # Suppliers: scoring + monetary fields
        supplier_signals = norm & {
            'global_score', 'e_score', 's_score', 'g_score',
            'esg_score', 'env_score', 'social_score', 'gov_score',
            'governance_score', 'annual_spend_eur', 'spend',
            'audit_status', 'audit_date',
        }
        if len(supplier_signals) >= 2 and (norm & {'name', 'nom', 'supplier_name',
                                                    'nom_fournisseur', 'fournisseur'}):
            return 'suppliers'

        # Risks: likelihood × impact fields
        risk_signals = norm & {
            'probability', 'probabilite', 'likelihood',
            'impact', 'severity', 'gravite',
            'risk_score', 'mitigation_status', 'inherent_risk', 'residual_risk',
        }
        if len(risk_signals) >= 2 and (norm & {'title', 'titre', 'risk_name', 'risque',
                                                'risk', 'name', 'nom'}):
            return 'risks'

        return 'generic'

    # ── Dedicated dispatchers ────────────────────────────────────────────
    async def _import_materiality(
        self, all_rows: list[dict], tenant_id: UUID, user_id: UUID,
    ) -> dict[str, Any]:
        """Import rows into ``materiality_issues`` table."""
        issues_to_add: list[MaterialityIssue] = []
        errors = []
        for idx, r in enumerate(all_rows):
            try:
                name = (
                    r.get('name') or r.get('nom') or r.get('enjeu')
                    or r.get('topic_name') or r.get('title')
                )
                if not name:
                    errors.append({'row': idx + 1, 'error': 'Missing name/enjeu'})
                    continue

                def _num(*keys, default=50.0):
                    for k in keys:
                        v = r.get(k)
                        if v is not None and v != '':
                            try:
                                return float(v)
                            except (ValueError, TypeError):
                                pass
                    return default

                def _bool(*keys):
                    for k in keys:
                        v = r.get(k)
                        if v is None or v == '':
                            continue
                        s = str(v).strip().lower()
                        return s in {'true', '1', 'yes', 'oui', 'y', 'o', 'material', 'materielle'}
                    return False

                issues_to_add.append(MaterialityIssue(
                    tenant_id=tenant_id,
                    name=str(name).strip()[:255],
                    description=str(r.get('description') or r.get('desc') or '')[:2000] or None,
                    category=str(r.get('category') or r.get('categorie') or 'general')[:100],
                    financial_impact=_num('financial_impact', 'impact_financier'),
                    esg_impact=_num('esg_impact', 'impact_esg', 'environmental_impact', 'business_impact'),
                    is_material=_bool('is_material', 'materielle'),
                    priority=(str(r.get('priority') or r.get('priorite') or '')[:20] or None),
                    stakeholders=str(r.get('stakeholders') or r.get('parties_prenantes') or '')[:1000] or None,
                ))
            except Exception as e:
                errors.append({'row': idx + 1, 'error': str(e), 'data': r})

        if issues_to_add:
            await self._ensure_rls_context(tenant_id, user_id)
            self.db.add_all(issues_to_add)
            await self.db.flush()
        return {'imported': len(issues_to_add), 'errors': len(errors), 'errors_detail': errors}

    async def _import_risks(
        self, all_rows: list[dict], tenant_id: UUID, user_id: UUID,
    ) -> dict[str, Any]:
        """Import rows into ``esg_risks`` table."""
        risks_to_add: list[ESGRisk] = []
        errors = []
        for idx, r in enumerate(all_rows):
            try:
                title = r.get('title') or r.get('titre') or r.get('risk_name') or r.get('name') or r.get('risque')
                if not title:
                    errors.append({'row': idx + 1, 'error': 'Missing title/name'})
                    continue

                def _int(*keys, default=3):
                    for k in keys:
                        v = r.get(k)
                        if v is not None and v != '':
                            try:
                                return max(1, min(5, int(float(v))))
                            except (ValueError, TypeError):
                                pass
                    return default

                proba  = _int('probability', 'probabilite', 'likelihood')
                impact = _int('impact', 'severity', 'gravite')
                score  = r.get('risk_score')
                try:
                    score = int(float(score)) if score not in (None, '') else proba * impact
                except (ValueError, TypeError):
                    score = proba * impact

                risks_to_add.append(ESGRisk(
                    tenant_id=tenant_id,
                    title=str(title).strip()[:255],
                    description=str(r.get('description') or '')[:2000] or None,
                    category=str(r.get('category') or r.get('categorie') or 'general')[:100],
                    probability=proba,
                    impact=impact,
                    risk_score=score,
                    severity=(str(r.get('severity') or '')[:20] or None),
                    mitigation_status=(str(r.get('mitigation_status') or r.get('status') or '')[:50] or None),
                    responsible_person=(str(r.get('owner') or r.get('responsible') or r.get('responsable') or '')[:255] or None),
                ))
            except Exception as e:
                errors.append({'row': idx + 1, 'error': str(e), 'data': r})

        if risks_to_add:
            await self._ensure_rls_context(tenant_id, user_id)
            self.db.add_all(risks_to_add)
            await self.db.flush()
        return {'imported': len(risks_to_add), 'errors': len(errors), 'errors_detail': errors}

    async def _import_suppliers(
        self, all_rows: list[dict], tenant_id: UUID, user_id: UUID,
    ) -> dict[str, Any]:
        """Import rows into ``suppliers`` table."""
        suppliers_to_add: list[Supplier] = []
        errors = []
        for idx, r in enumerate(all_rows):
            try:
                name = r.get('name') or r.get('nom') or r.get('supplier_name') or r.get('fournisseur') or r.get('nom_fournisseur')
                if not name:
                    errors.append({'row': idx + 1, 'error': 'Missing supplier name'})
                    continue

                def _num(*keys):
                    for k in keys:
                        v = r.get(k)
                        if v is not None and v != '':
                            try:
                                return float(v)
                            except (ValueError, TypeError):
                                pass
                    return None

                # annual_spend_eur (in EUR) → spend_k_eur (in kEUR)
                spend_eur = _num('annual_spend_eur', 'spend_eur', 'depenses')
                spend_k_eur = _num('spend_k_eur', 'spend')
                if spend_k_eur is None and spend_eur is not None:
                    spend_k_eur = spend_eur / 1000.0

                suppliers_to_add.append(Supplier(
                    tenant_id=tenant_id,
                    name=str(name).strip()[:255],
                    country=(str(r.get('country') or r.get('pays') or '')[:100] or None),
                    category=(str(r.get('sector') or r.get('secteur') or r.get('category') or '')[:100] or None),
                    spend_k_eur=spend_k_eur,
                    risk_level=(str(r.get('risk_level') or '')[:20].lower() or None),
                    global_score=_num('global_score', 'esg_score', 'overall_score'),
                    env_score=_num('e_score', 'env_score', 'environment_score', 'environmental_score'),
                    social_score=_num('s_score', 'social_score'),
                    gov_score=_num('g_score', 'gov_score', 'governance_score'),
                    status='active',
                ))
            except Exception as e:
                errors.append({'row': idx + 1, 'error': str(e), 'data': r})

        if suppliers_to_add:
            await self._ensure_rls_context(tenant_id, user_id)
            self.db.add_all(suppliers_to_add)
            await self.db.flush()
        return {'imported': len(suppliers_to_add), 'errors': len(errors), 'errors_detail': errors}

    async def _ensure_rls_context(self, tenant_id: UUID, user_id: UUID) -> None:
        """Set RLS GUCs on the current connection — defensive, idempotent."""
        try:
            await self.db.execute(
                text("SELECT set_config('app.current_tenant_id', :tid, false)"),
                {"tid": str(tenant_id)},
            )
            await self.db.execute(
                text("SELECT set_config('app.current_user_id', :uid, false)"),
                {"uid": str(user_id)},
            )
        except Exception as exc:
            logger.warning("RLS context set failed: %s", exc)

    async def import_to_data_entries(
        self,
        upload_id: UUID,
        column_mapping: dict[str, str],
        tenant_id: UUID,
        user_id: UUID,
        organization_id: Optional[UUID] = None,
    ) -> dict[str, Any]:
        """Import data from upload — dispatches to the appropriate table.

        Based on the file's columns, routes to one of:
          * ``materiality_issues`` (matrice de matérialité)
          * ``esg_risks``          (registre des risques)
          * ``suppliers``          (supply chain ESG)
          * ``data_entries`` + ``indicator_data``  (generic / GHG / KPIs)
        """

        # ── Defensive: ensure the RLS tenant context is set on THIS session ───
        # The data_entries / indicator_data tables have FORCE RLS with a
        # WITH CHECK policy of tenant_id = current_setting('app.current_tenant_id').
        # If this connection is missing the setting (or has a stale one from a
        # previous request on the same pooled connection), the INSERT will fail
        # with "new row violates row-level security policy".
        try:
            await self.db.execute(
                text("SELECT set_config('app.current_tenant_id', :tid, false)"),
                {"tid": str(tenant_id)},
            )
            # Verify the setting actually stuck — log for diagnostics
            check = await self.db.execute(text("SELECT current_setting('app.current_tenant_id', true)"))
            current = check.scalar()
            if current != str(tenant_id):
                logger.warning(
                    "RLS context mismatch in import_to_data_entries: expected=%s, actual=%s",
                    tenant_id, current,
                )
        except Exception as exc:
            logger.error("Could not set RLS context for import: %s", exc)

        result = await self.db.execute(
            select(DataUpload).where(
                DataUpload.id == upload_id,
                DataUpload.tenant_id == tenant_id
            )
        )
        upload = result.scalar_one_or_none()

        if not upload:
            raise ValueError("Upload not found")

        # ── Dispatch by file intent ─────────────────────────────────────────
        # If the file looks like a materiality / risks / suppliers table,
        # route it to the dedicated table (which the corresponding UI page
        # actually reads from). Otherwise fall through to the generic
        # data_entries + indicator_data path below.
        original_columns = (upload.file_metadata or {}).get('columns') or []
        all_rows = (upload.file_metadata or {}).get('all_rows') or upload.data_preview or []
        intent = self._detect_file_intent(original_columns)
        logger.info("Import dispatch: file=%s rows=%d intent=%s", upload.filename, len(all_rows), intent)

        if intent in ('materiality', 'risks', 'suppliers'):
            try:
                if intent == 'materiality':
                    res = await self._import_materiality(all_rows, tenant_id, user_id)
                elif intent == 'risks':
                    res = await self._import_risks(all_rows, tenant_id, user_id)
                else:
                    res = await self._import_suppliers(all_rows, tenant_id, user_id)

                # Update the upload row & audit log
                upload.valid_rows   = res['imported']
                upload.invalid_rows = res['errors']
                upload.status       = 'imported' if res['imported'] > 0 else 'failed'
                self.db.add(AuditLog(
                    tenant_id=tenant_id,
                    entity_type=intent,
                    entity_id=upload_id,
                    action='bulk_import',
                    user_id=user_id,
                    new_values={
                        'source': 'csv_import', 'filename': upload.filename,
                        'imported': res['imported'], 'errors': res['errors'],
                        'target_table': {'materiality': 'materiality_issues',
                                         'risks': 'esg_risks',
                                         'suppliers': 'suppliers'}[intent],
                    },
                ))
                await self.db.commit()
                return {
                    'imported':                res['imported'],
                    'errors':                  res['errors'],
                    'errors_detail':           res.get('errors_detail', [])[:10],
                    'indicator_data_created':  0,
                    'target':                  intent,
                }
            except Exception as exc:
                logger.exception("Dispatcher %s failed: %s", intent, exc)
                await self.db.rollback()
                await self._ensure_rls_context(tenant_id, user_id)
                upload.status = 'failed'
                upload.error_message = str(exc)[:500]
                try:
                    await self.db.commit()
                except Exception:
                    await self.db.rollback()
                return {
                    'imported': 0, 'errors': len(all_rows),
                    'errors_detail': [{'row': 'all', 'error': str(exc)}],
                    'indicator_data_created': 0,
                    'target': intent,
                }

        # ── Generic path: ESG indicators / GHG / KPIs → data_entries ────────
        # Re-run auto-detection on the file's original columns
        # The frontend posts back a flat ``{target: source_col}`` mapping.
        # We merge it on top of the auto-detected one (which may contain
        # composite-metric directives or inferred unit/pillar) so that:
        #   - user-overridden fields take precedence
        #   - composites / inferences kick in for fields the user left blank
        auto_mapping = self._auto_detect_columns(original_columns) if original_columns else {}
        # Merge: user choices override auto for explicit fields
        merged_mapping: dict[str, Any] = dict(auto_mapping)
        for k, v in (column_mapping or {}).items():
            if v:  # ignore empty / None
                merged_mapping[k] = v
        column_mapping = merged_mapping

        # ------------------------------------------------------------------
        # Build indicator lookup: name (lowercase) → Indicator
        #                        code (lowercase) → Indicator
        # ------------------------------------------------------------------
        ind_result = await self.db.execute(
            select(Indicator).where(
                Indicator.tenant_id == tenant_id,
                Indicator.is_active == True,
            )
        )
        indicators_by_name: dict[str, Indicator] = {}
        indicators_by_code: dict[str, Indicator] = {}
        for ind in ind_result.scalars().all():
            indicators_by_name[ind.name.lower().strip()] = ind
            indicators_by_code[ind.code.lower().strip()] = ind

        imported_count = 0
        indicator_data_created = 0
        error_count = 0
        errors = []

        # Lire toutes les lignes (data_preview = 10 lignes seulement pour l'UI)
        all_rows = (upload.file_metadata or {}).get('all_rows') or upload.data_preview or []

        # ── Strategy: bulk INSERT via add_all() with a single flush at the end.
        # Per-row log_change calls used to do db.commit() inside the loop, which
        # combined with pooled-connection state changes triggered RLS races.
        # We now build all entries in memory, then INSERT in one batch with the
        # RLS context defensively (re-)set right before the flush.
        entries_to_add: list[DataEntry] = []
        indicator_data_to_add: list[IndicatorData] = []

        # ── Auto-pick a default org if none was provided ─────────────────
        # Indicateurs are typically organisation-scoped; without an org_id
        # they wouldn't appear in the org-filtered Indicators page. We fall
        # back to the tenant's first organisation if available.
        if organization_id is None:
            try:
                from app.models.organization import Organization
                org_res = await self.db.execute(
                    select(Organization).where(Organization.tenant_id == tenant_id).limit(1)
                )
                default_org = org_res.scalar_one_or_none()
                if default_org is not None:
                    organization_id = default_org.id
            except Exception as exc:
                logger.warning("Could not pick default org for import: %s", exc)

        # Indicator codes already issued in this batch — avoid dup INSERTs.
        # Map: metric_key → freshly-created Indicator instance (still pending flush)
        newly_created_indicators: dict[str, Indicator] = {}
        # Track which IndicatorData rows still need their indicator_id rebound
        # after the first flush.
        pending_rebinds: list[tuple] = []  # (indicator_data, indicator)

        def _slug(s: str) -> str:
            """Slugify a metric name into a CODE (upper, no spaces, ≤50 chars)."""
            import re as _re, unicodedata as _ud
            norm = _ud.normalize('NFKD', s)
            norm = ''.join(c for c in norm if not _ud.combining(c))
            norm = _re.sub(r'[^A-Za-z0-9]+', '_', norm.upper()).strip('_')
            return norm[:50] or 'METRIC'

        for idx, row_data in enumerate(all_rows):
            try:
                entry_data = self._map_row_to_entry(row_data, column_mapping)
                self._validate_entry_types(entry_data, idx)

                resolved_org_id = organization_id

                entry = DataEntry(
                    tenant_id=tenant_id,
                    created_by=user_id,
                    collection_method='csv_import',
                    organization_id=resolved_org_id,
                    **entry_data
                )
                entries_to_add.append(entry)

                # ── Bridge to indicator_data ──────────────────────────────
                # Strategy: if metric_name matches an existing Indicator, reuse
                # it. Otherwise, auto-create a new Indicator on the fly so the
                # row becomes visible on the "Indicateurs" page immediately —
                # no more silent drop into data_entries when no catalog entry
                # exists for the metric.
                if entry_data.get('value_numeric') is not None and entry_data.get('metric_name'):
                    metric_key = str(entry_data['metric_name']).lower().strip()
                    matched_indicator = (
                        indicators_by_name.get(metric_key)
                        or indicators_by_code.get(metric_key)
                        or newly_created_indicators.get(metric_key)
                    )
                    if not matched_indicator:
                        # Auto-create an Indicator entry so the metric appears
                        # in the Indicateurs page and can be used by scoring.
                        new_code = _slug(entry_data['metric_name'])
                        # Ensure uniqueness within this batch + existing catalog
                        suffix = 1
                        candidate = new_code
                        while (candidate.lower() in indicators_by_code
                               or any(i.code == candidate for i in newly_created_indicators.values())):
                            suffix += 1
                            candidate = f'{new_code}_{suffix}'[:50]
                        matched_indicator = Indicator(
                            tenant_id=tenant_id,
                            code=candidate,
                            name=str(entry_data['metric_name'])[:255],
                            pillar=entry_data.get('pillar') or 'environmental',
                            category=entry_data.get('category') or 'general',
                            unit=entry_data.get('unit') or '',
                            data_type='numeric',
                            description=f'Auto-créé depuis import CSV ({upload.filename})'[:500],
                            is_active=True,
                            is_mandatory=False,
                            framework='CSV_IMPORT',
                        )
                        self.db.add(matched_indicator)
                        newly_created_indicators[metric_key] = matched_indicator
                        # Indexed on name too so identical names in the SAME
                        # batch reuse this one
                        indicators_by_name[metric_key] = matched_indicator

                    data_date = entry_data.get('period_start')
                    if not isinstance(data_date, date):
                        data_date = date.today()
                    ind_data = IndicatorData(
                        tenant_id=tenant_id,
                        # Will be re-bound after the first flush if the
                        # Indicator was auto-created in this batch (its id is
                        # None right now).
                        indicator_id=matched_indicator.id,
                        organization_id=resolved_org_id,
                        upload_id=upload_id,
                        date=data_date,
                        value=float(entry_data['value_numeric']),
                        unit=entry_data.get('unit') or matched_indicator.unit,
                        notes=entry_data.get('notes'),
                        source='upload',
                        is_verified=False,
                    )
                    indicator_data_to_add.append(ind_data)
                    if matched_indicator.id is None:
                        pending_rebinds.append((ind_data, matched_indicator))
            except Exception as e:
                error_count += 1
                errors.append({'row': idx + 1, 'error': str(e), 'data': row_data})
                continue

        # ── If we auto-created indicators, flush them FIRST so they get
        # primary keys, then re-bind indicator_data.indicator_id to the
        # freshly-assigned UUIDs.
        if newly_created_indicators:
            try:
                await self.db.flush()
                for ind_data, indicator in pending_rebinds:
                    if indicator.id is not None:
                        ind_data.indicator_id = indicator.id
            except Exception as exc:
                logger.warning("Indicator auto-create flush failed: %s", exc)

        # ── Bulk add + flush with RLS context guaranteed on THIS connection ──
        if entries_to_add or indicator_data_to_add:
            # Re-assert RLS context on this exact connection right before the
            # flush — defends against pool-checkout corner cases.
            try:
                await self.db.execute(
                    text("SELECT set_config('app.current_tenant_id', :tid, false)"),
                    {"tid": str(tenant_id)},
                )
                await self.db.execute(
                    text("SELECT set_config('app.current_user_id', :uid, false)"),
                    {"uid": str(user_id)},
                )
            except Exception as exc:
                logger.warning("Pre-bulk set_config failed: %s", exc)

            if entries_to_add:
                self.db.add_all(entries_to_add)
            if indicator_data_to_add:
                self.db.add_all(indicator_data_to_add)

            try:
                await self.db.flush()
                imported_count = len(entries_to_add)
                indicator_data_created = len(indicator_data_to_add)
            except Exception as exc:
                # If the bulk INSERT fails, log and roll back so the session
                # is reusable for the audit log + upload status update below.
                logger.exception("Bulk INSERT failed for tenant %s: %s", tenant_id, exc)
                await self.db.rollback()
                error_count = len(entries_to_add)
                errors.append({'row': 'bulk', 'error': str(exc), 'data': None})
                imported_count = 0
                indicator_data_created = 0
                # Restore the RLS context after rollback (rollback may have
                # reset the session-level GUC in some pooler configurations).
                try:
                    await self.db.execute(
                        text("SELECT set_config('app.current_tenant_id', :tid, false)"),
                        {"tid": str(tenant_id)},
                    )
                except Exception:
                    pass

        # ── Single audit log entry for the whole import (no per-row commits) ──
        if imported_count > 0:
            try:
                audit_entry = AuditLog(
                    tenant_id=tenant_id,
                    entity_type='data_entries',
                    entity_id=upload_id,
                    action='bulk_import',
                    user_id=user_id,
                    new_values={
                        'source': 'csv_import',
                        'filename': upload.filename,
                        'imported': imported_count,
                        'errors': error_count,
                    },
                )
                self.db.add(audit_entry)
            except Exception as exc:
                logger.warning("Could not write bulk audit log: %s", exc)

        # Update the upload row's counters
        try:
            upload.valid_rows   = imported_count
            upload.invalid_rows = error_count
            upload.status       = 'imported' if imported_count > 0 else 'failed'
        except Exception as exc:
            logger.warning("Could not update upload counters: %s", exc)

        try:
            await self.db.commit()
        except Exception as exc:
            logger.exception("Final commit failed: %s", exc)
            await self.db.rollback()

        return {
            'imported': imported_count,
            'indicator_data_created': indicator_data_created,
            'errors': error_count,
            'error_details': errors[:50],
            'upload_id': str(upload_id)
        }
    
    def _validate_entry_types(self, entry_data: dict, row_idx: int):
        """Validate data types before insertion."""
        
        # String fields
        string_fields = ['pillar', 'category', 'metric_name', 'unit', 'data_source', 'notes']
        for field in string_fields:
            value = entry_data.get(field)
            if value is not None and not isinstance(value, str):
                # Convert to string
                entry_data[field] = str(value)
        
        # Numeric fields
        if 'value_numeric' in entry_data and entry_data['value_numeric'] is not None:
            try:
                entry_data['value_numeric'] = float(entry_data['value_numeric'])
            except (ValueError, TypeError) as e:
                raise ValueError(f"Row {row_idx + 1}: Invalid numeric value: {entry_data['value_numeric']}")
        
        # Date fields
        for date_field in ['period_start', 'period_end']:
            if date_field in entry_data and entry_data[date_field]:
                if not isinstance(entry_data[date_field], (date, datetime)):
                    raise ValueError(f"Row {row_idx + 1}: Invalid date format for {date_field}")
        
        # Required fields
        required = ['metric_name', 'pillar']
        for field in required:
            if not entry_data.get(field):
                raise ValueError(f"Row {row_idx + 1}: Missing required field: {field}")
    
    def _auto_detect_columns(self, columns: list[str]) -> dict[str, Any]:
        """Auto-detect column mapping with fuzzy normalisation + inference.

        Returns a mapping dict where each key is a target field
        (metric_name / value_numeric / period_start / …) and each value is
        either:
          * the source column name (string) when a single column matches
          * a special directive dict ``{'_composite': [col_a, col_b, ...]}``
            when ``metric_name`` is built from multiple columns
          * a directive ``{'_const': value}`` for inferred constants
            (e.g. pillar='environmental' deduced from a tCO2e column)

        The presence of ``_inferred_unit`` and ``_inferred_pillar`` keys at
        the dict root signals what was deduced — surfaced in the UI so the
        user knows what happened.
        """
        # Build a lookup: normalised column name → original column name
        normalised: dict[str, str] = {self._normalize_col(c): c for c in columns}

        mapping: dict[str, Any] = {}

        # ── 1. Direct alias matching (most precise) ───────────────────────
        for target, aliases in self.COLUMN_MAPPINGS.items():
            for alias in aliases:
                if alias in normalised:
                    mapping[target] = normalised[alias]
                    break

        # ── 2. Composite metric_name fallback ─────────────────────────────
        # If no metric_name column was found, build one from scope/category/source.
        if 'metric_name' not in mapping:
            component_cols: list[str] = []
            for comp in self.METRIC_COMPONENTS:
                if comp in normalised and normalised[comp] not in component_cols:
                    component_cols.append(normalised[comp])
            if component_cols:
                mapping['metric_name'] = {'_composite': component_cols}

        # ── 3. Unit inference from value column name ──────────────────────
        # If we matched value_numeric on a column like 'tco2e' or 'kwh',
        # remember the implicit unit so we can pre-fill it on each row.
        if 'value_numeric' in mapping and 'unit' not in mapping:
            value_norm = self._normalize_col(mapping['value_numeric'])
            if value_norm in self.UNIT_BY_COLUMN:
                mapping['_inferred_unit'] = self.UNIT_BY_COLUMN[value_norm]

        # ── 4. Pillar inference from column-name hints ────────────────────
        if 'pillar' not in mapping:
            for col_norm in normalised.keys():
                for hint, pillar in self.PILLAR_HINTS.items():
                    if hint in col_norm:
                        mapping['_inferred_pillar'] = pillar
                        break
                if '_inferred_pillar' in mapping:
                    break

        # ── 5. Default period if only one date column exists ──────────────
        # If period_start was found but period_end wasn't (or vice-versa),
        # use the same column for both — the mapper will compute year-end.
        if 'period_start' in mapping and 'period_end' not in mapping:
            mapping['_period_end_from_start'] = True

        # ── 6. Partial-keyword fallback for value_numeric ─────────────────
        # If we still haven't found a numeric value column, scan for any
        # column whose normalised name CONTAINS a semantic keyword. This
        # catches custom column names like ``my_co2_emissions``,
        # ``2024_revenue_eur``, ``customer_satisfaction_score``, etc.
        if 'value_numeric' not in mapping:
            value_keywords = (
                'score', 'rating', 'impact', 'amount', 'value', 'valeur',
                'montant', 'co2', 'ges', 'emission', 'kwh', 'mwh',
                'tco2', 'kg', 'tonnes', 'volume', 'quantite', 'total',
                'spend', 'revenue', 'eur', 'usd', 'price', 'cost',
                'severity', 'likelihood', 'risk', 'probability',
                'percent', 'percentage', 'ratio', 'rate',
            )
            for col_norm, original in normalised.items():
                # Skip already-mapped columns (don't steal them)
                if original in mapping.values():
                    continue
                if any(kw in col_norm for kw in value_keywords):
                    mapping['value_numeric'] = original
                    # Try to infer unit from the matched keyword
                    for kw, unit in self.UNIT_BY_COLUMN.items():
                        if kw in col_norm:
                            mapping.setdefault('_inferred_unit', unit)
                            break
                    break

        # ── 7. Partial-keyword fallback for metric_name ───────────────────
        # If still no metric_name (and no composite), use the first text-like
        # column — typically the first column is the entity / label.
        if 'metric_name' not in mapping:
            name_keywords = (
                'name', 'nom', 'libelle', 'titre', 'title', 'label',
                'indicateur', 'metric', 'code', 'description', 'desc',
                'enjeu', 'risk', 'risque', 'topic', 'item',
            )
            for col_norm, original in normalised.items():
                if original in mapping.values():
                    continue
                if any(kw in col_norm for kw in name_keywords):
                    mapping['metric_name'] = original
                    break
            # Last resort: take the very first column
            if 'metric_name' not in mapping and normalised:
                first_original = next(iter(normalised.values()))
                if first_original not in mapping.values():
                    mapping['metric_name'] = first_original

        return mapping
    
    def _map_row_to_entry(self, row: dict, mapping: dict[str, Any]) -> dict:
        """Map a CSV row to DataEntry fields, handling composites + inference."""

        entry_data: dict[str, Any] = {}

        # ── pillar (with inference fallback) ───────────────────────────────
        pillar_col = mapping.get('pillar')
        if isinstance(pillar_col, str) and pillar_col:
            entry_data['pillar'] = str(row.get(pillar_col, '') or '').strip().lower() or 'environmental'
        else:
            entry_data['pillar'] = mapping.get('_inferred_pillar') or 'environmental'

        # ── category ───────────────────────────────────────────────────────
        cat_col = mapping.get('category')
        entry_data['category'] = str(row.get(cat_col, '') or '') if isinstance(cat_col, str) else ''

        # ── metric_name: column OR composite of multiple columns ──────────
        metric_def = mapping.get('metric_name')
        if isinstance(metric_def, dict) and '_composite' in metric_def:
            parts = [
                str(row.get(c, '') or '').strip()
                for c in metric_def['_composite']
            ]
            parts = [p for p in parts if p]
            entry_data['metric_name'] = ' / '.join(parts) if parts else ''
        elif isinstance(metric_def, str) and metric_def:
            entry_data['metric_name'] = str(row.get(metric_def, '') or '').strip()
        else:
            entry_data['metric_name'] = ''

        # ── value_numeric ──────────────────────────────────────────────────
        value_col = mapping.get('value_numeric')
        value = row.get(value_col) if isinstance(value_col, str) else None
        if value is not None and value != '':
            # Strip thousands separators (1 234,56 → 1234.56) and units suffixes
            try:
                if isinstance(value, str):
                    cleaned = value.strip().replace(' ', '').replace(' ', '')
                    # French decimal comma
                    if ',' in cleaned and '.' not in cleaned:
                        cleaned = cleaned.replace(',', '.')
                    else:
                        cleaned = cleaned.replace(',', '')
                    # Drop trailing non-numeric (e.g. "26.5 tCO2e")
                    import re
                    m = re.match(r'^-?\d+(?:\.\d+)?', cleaned)
                    cleaned = m.group(0) if m else cleaned
                    entry_data['value_numeric'] = float(cleaned) if cleaned else None
                else:
                    entry_data['value_numeric'] = float(value)
            except (ValueError, TypeError):
                entry_data['value_numeric'] = None

        # ── unit ───────────────────────────────────────────────────────────
        unit_col = mapping.get('unit')
        if isinstance(unit_col, str) and unit_col and row.get(unit_col):
            entry_data['unit'] = str(row.get(unit_col, '') or '').strip()
        else:
            entry_data['unit'] = mapping.get('_inferred_unit', '')

        # ── period_start ──────────────────────────────────────────────────
        ps_col = mapping.get('period_start')
        period_start = row.get(ps_col) if isinstance(ps_col, str) else None
        entry_data['period_start'] = self._parse_date(period_start) or date.today().replace(day=1)

        # ── period_end ────────────────────────────────────────────────────
        pe_col = mapping.get('period_end')
        if isinstance(pe_col, str) and pe_col:
            period_end = self._parse_date(row.get(pe_col))
        elif mapping.get('_period_end_from_start'):
            # Same year as period_start, default to Dec-31
            ps = entry_data['period_start']
            period_end = date(ps.year, 12, 31) if isinstance(ps, date) else None
        else:
            period_end = None
        entry_data['period_end'] = period_end or date.today()

        # ── data_source ───────────────────────────────────────────────────
        ds_col = mapping.get('data_source')
        entry_data['data_source'] = (
            str(row.get(ds_col, '') or 'CSV Import') if isinstance(ds_col, str) else 'CSV Import'
        )

        # ── notes ─────────────────────────────────────────────────────────
        notes_col = mapping.get('notes')
        entry_data['notes'] = str(row.get(notes_col, '') or '') if isinstance(notes_col, str) else ''

        return entry_data

    @staticmethod
    def _parse_date(value: Any) -> Optional[date]:
        """Parse a value into a date, accepting many common formats."""
        if value is None or value == '' or (isinstance(value, float) and pd.isna(value)):
            return None
        if isinstance(value, date):
            return value
        if isinstance(value, datetime):
            return value.date()
        # Excel sometimes ships pd.Timestamp
        if hasattr(value, 'date'):
            try:
                return value.date()
            except Exception:
                pass
        s = str(value).strip()
        if not s:
            return None
        # Year-only ("2025") → Jan 1
        if s.isdigit() and len(s) == 4:
            try:
                return date(int(s), 1, 1)
            except Exception:
                pass
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%Y%m%d',
                    '%d.%m.%Y', '%m/%d/%Y'):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None
    
    def _validate_for_import(self, df: pd.DataFrame, mapping: dict) -> dict:
        """Validate data for import — composite-aware."""
        errors: dict[str, Any] = {}
        valid_count = 0
        invalid_count = 0

        required = ['metric_name', 'value_numeric']
        missing = [col for col in required if col not in mapping]
        if missing:
            return {
                'valid_count': 0,
                'invalid_count': len(df),
                'errors': {'missing_columns': missing},
            }

        metric_def = mapping.get('metric_name')
        value_col = mapping.get('value_numeric')

        # Helper: does the row have a non-empty metric name (composite or scalar)?
        def _has_metric(row) -> bool:
            if isinstance(metric_def, dict) and '_composite' in metric_def:
                for c in metric_def['_composite']:
                    v = row.get(c)
                    if v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip():
                        return True
                return False
            if isinstance(metric_def, str) and metric_def:
                v = row.get(metric_def)
                return v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip() != ''
            return False

        for idx, row in df.iterrows():
            row_errors = []
            if not _has_metric(row):
                row_errors.append("Missing metric_name")
            if isinstance(value_col, str) and value_col:
                v = row.get(value_col)
                if v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() == '':
                    row_errors.append("Missing value")
            if row_errors:
                errors[f'row_{idx}'] = row_errors
                invalid_count += 1
            else:
                valid_count += 1

        return {
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'errors': errors if errors else None,
        }
    
    def _detect_file_type(self, filename: str) -> str:
        """Detect file type identifier from filename (kept ≤ 50 chars)."""
        if filename.endswith('.csv'):
            return 'csv'
        elif filename.endswith('.xlsx'):
            return 'xlsx'
        elif filename.endswith('.xls'):
            return 'xls'
        return 'unknown'
    
    def _read_csv_robust(self, file_content: bytes) -> 'pd.DataFrame':
        """Read CSV with fallbacks: BOM handling, separator detection, bad-line tolerance."""
        import math

        # Try separators in order: comma, semicolon
        for sep in [',', ';']:
            for enc in ['utf-8-sig', 'utf-8', 'latin-1']:
                try:
                    df = pd.read_csv(
                        io.BytesIO(file_content),
                        sep=sep,
                        encoding=enc,
                        on_bad_lines='warn',   # skip malformed rows instead of crashing
                        engine='python',       # python engine supports on_bad_lines
                    )
                    # Require at least 2 columns to be a valid ESG file
                    if len(df.columns) >= 2:
                        return df
                except Exception:
                    continue
        raise ValueError("Impossible de lire le fichier CSV — vérifiez le format (UTF-8, séparateur virgule ou point-virgule)")

    def _clean_nan(self, data: list[dict]) -> list[dict]:
        """Replace NaN/numpy types with JSON-serializable native Python types."""
        import math
        try:
            import numpy as np
            has_numpy = True
        except ImportError:
            has_numpy = False

        cleaned = []
        for row in data:
            cleaned_row = {}
            for key, value in row.items():
                if value is None:
                    cleaned_row[key] = None
                elif isinstance(value, float) and math.isnan(value):
                    cleaned_row[key] = None
                elif has_numpy and isinstance(value, np.integer):
                    cleaned_row[key] = int(value)
                elif has_numpy and isinstance(value, np.floating):
                    cleaned_row[key] = None if np.isnan(value) else float(value)
                elif has_numpy and isinstance(value, np.bool_):
                    cleaned_row[key] = bool(value)
                elif has_numpy and isinstance(value, np.ndarray):
                    cleaned_row[key] = value.tolist()
                elif hasattr(value, 'isoformat'):
                    # pandas Timestamp / datetime / date
                    cleaned_row[key] = str(value)
                elif isinstance(value, (int, float, str, bool)):
                    cleaned_row[key] = value
                else:
                    # Fallback: stringify anything unknown
                    cleaned_row[key] = str(value)
            cleaned.append(cleaned_row)
        return cleaned
