"""
HR Import — ESRS S1 connector for Silae, Lucca, PayFit, Swile (CSV-based)
"""
import csv
import io
import re
import unicodedata
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.data_entry import DataEntry
from app.models.user import User

router = APIRouter()

VALID_SOURCES = {"silae", "lucca", "payfit", "swile", "generic"}

# ── Pre-aggregated KPI column mapping ───────────────────────────────────
# Used for files that already contain one row per period with summary
# columns (e.g. "effectif;femmes;turnover;..."). Header matching is
# accent/case/punctuation-insensitive (see _normalize_col / _match_column),
# so this dict only needs the canonical normalized forms — singular,
# plural, FR and EN variants commonly seen across Silae, Lucca, PayFit,
# Swile and generic exports.
COLUMN_MAPPING = {
    "effectif": ("s1_workforce_total", "Effectif total", "personnes"),
    "effectifs": ("s1_workforce_total", "Effectif total", "personnes"),
    "headcount": ("s1_workforce_total", "Effectif total", "personnes"),
    "salaries": ("s1_workforce_total", "Effectif total", "personnes"),
    "salarie": ("s1_workforce_total", "Effectif total", "personnes"),
    "employees": ("s1_workforce_total", "Effectif total", "personnes"),
    "cdi": ("s1_permanent_contracts", "Contrats CDI", "%"),
    "permanent": ("s1_permanent_contracts", "Contrats CDI", "%"),
    "femmes": ("s1_women_ratio", "Part femmes (effectif)", "%"),
    "femme": ("s1_women_ratio", "Part femmes (effectif)", "%"),
    "women": ("s1_women_ratio", "Part femmes (effectif)", "%"),
    "female": ("s1_women_ratio", "Part femmes (effectif)", "%"),
    "feminisation": ("s1_women_ratio", "Part femmes (effectif)", "%"),
    "parite": ("s1_women_ratio", "Part femmes (effectif)", "%"),
    "ecart_salarial": ("s1_pay_gap", "Écart salarial F/H", "%"),
    "pay_gap": ("s1_pay_gap", "Écart salarial F/H", "%"),
    "gender_gap": ("s1_pay_gap", "Écart salarial F/H", "%"),
    "heures_formation": ("s1_training_hours_per_employee", "Heures formation/salarié", "heures"),
    "training_hours": ("s1_training_hours_per_employee", "Heures formation/salarié", "heures"),
    "formation": ("s1_training_hours_per_employee", "Heures formation/salarié", "heures"),
    "absenteisme": ("s1_absenteeism_rate", "Taux absentéisme", "%"),
    "absence": ("s1_absenteeism_rate", "Taux absentéisme", "%"),
    "absenteeism": ("s1_absenteeism_rate", "Taux absentéisme", "%"),
    "accidents": ("s1_accident_frequency", "Taux fréquence accidents", "indice"),
    "accident": ("s1_accident_frequency", "Taux fréquence accidents", "indice"),
    "taux_frequence": ("s1_accident_frequency", "Taux fréquence accidents", "indice"),
    "frequency_rate": ("s1_accident_frequency", "Taux fréquence accidents", "indice"),
    "turnover": ("s1_turnover_rate", "Taux de turnover", "%"),
    "rotation": ("s1_turnover_rate", "Taux de turnover", "%"),
    "femmes_management": ("s1_women_management", "Femmes encadrement", "%"),
    "women_management": ("s1_women_management", "Femmes encadrement", "%"),
    "femmes_encadrement": ("s1_women_management", "Femmes encadrement", "%"),
    "femmes_cadres": ("s1_women_management", "Femmes encadrement", "%"),
    "embauches": ("s1_new_hires", "Nouvelles embauches", "personnes"),
    "recrutements": ("s1_new_hires", "Nouvelles embauches", "personnes"),
    "new_hires": ("s1_new_hires", "Nouvelles embauches", "personnes"),
    "hires": ("s1_new_hires", "Nouvelles embauches", "personnes"),
}

YEAR_COLUMNS = {"annee", "year", "periode", "period", "annee_fiscale", "fiscal_year", "exercice"}

# ── Per-employee roster detection (e.g. generic PayFit/Silae/Lucca export
# with one row per employee) ─────────────────────────────────────────────
# When no pre-aggregated KPI columns matched (or the file looks like a
# nominative roster — e.g. has an "employee_id"/"matricule"-like column,
# or a "gender"/"sexe" column with categorical M/F-style values), we treat
# the file as 1 row = 1 collaborateur and AGGREGATE it into ESRS S1
# indicators ourselves, instead of trying (and failing) to map columns 1:1.
# Aliases below cover common FR/EN naming conventions across Silae, Lucca,
# PayFit, Swile and generic exports — header comparison is accent/case/
# punctuation-insensitive (see _normalize_col).
EMPLOYEE_ROLE_ALIASES: dict[str, set[str]] = {
    "employee_id": {
        "employee_id", "matricule", "id_salarie", "emp_id", "salarie_id",
        "id_employee", "employee_number", "numero_salarie", "num_salarie",
        "code_salarie", "personnel_number", "matricule_salarie",
    },
    "gender": {
        "gender", "sexe", "genre", "sex", "civilite",
    },
    "salary": {
        "salary_annual", "salaire_annuel", "salaire", "salary",
        "remuneration_annuelle", "annual_salary", "remuneration",
        "salaire_brut", "salaire_brut_annuel", "salaire_de_base",
        "base_salary", "gross_salary", "remuneration_brute_annuelle",
    },
    "hire_date": {
        "hire_date", "date_embauche", "date_entree", "date_arrivee",
        "date_d_entree", "date_d_embauche", "start_date", "entry_date",
    },
    "exit_date": {
        "exit_date", "date_sortie", "date_depart", "date_de_sortie",
        "date_de_depart", "end_date", "departure_date", "date_fin_contrat",
    },
    "contract_type": {
        "contract_type", "type_contrat", "contrat", "type_de_contrat",
        "nature_contrat", "contract", "employment_type",
    },
    "job_title": {
        "job_title", "poste", "fonction", "intitule_poste",
        "intitule_du_poste", "title", "categorie",
        "categorie_professionnelle", "job_category", "position", "role",
        "emploi", "statut",
    },
    "training_hours": {
        "training_hours", "heures_formation", "heures_de_formation",
        "formation_heures", "nb_heures_formation",
    },
    "absence_days": {
        "absence_days", "jours_absence", "jours_d_absence",
        "nb_jours_absence", "jours_arret",
    },
}

GENDER_FEMALE_VALUES = {"f", "femme", "female", "woman", "women", "feminin"}
GENDER_MALE_VALUES = {"m", "h", "homme", "male", "man", "men", "masculin"}

# Substring keywords (matched against the normalized contract-type value) —
# covers free-text values like "CDI temps plein", "Permanent - full time"...
PERMANENT_CONTRACT_KEYWORDS = {"cdi", "permanent", "indefinite", "unlimited", "open-ended", "open ended"}

# Substring keywords identifying a management / supervisory role from a
# free-text job title / category column.
MANAGEMENT_KEYWORDS = {
    "manager", "manageur", "directeur", "directrice", "responsable", "chef",
    "head", "lead", "encadrant", "encadrement", "cadre", "supervisor",
    "director", "chief", "n+1", "superviseur", "president",
}

# Reference number of working days per year (France) used to convert a
# per-employee "absence days" column into an absenteeism rate (%).
WORKING_DAYS_PER_YEAR = 218


class MappedRow(BaseModel):
    esrs_code: str
    esrs_label: str
    unit: str
    value: float
    raw_column: str
    year: Optional[int] = None


class HRPreviewResponse(BaseModel):
    source: str
    rows_parsed: int
    mapped_rows: List[MappedRow]
    unmapped_columns: List[str]
    warnings: List[str]
    notes: List[str] = []


class SyncRequest(BaseModel):
    source: str
    year: int
    mapped_rows: List[MappedRow]


def _detect_year_from_filename(filename: str) -> Optional[int]:
    match = re.search(r"(20\d{2})", filename or "")
    if match:
        return int(match.group(1))
    return None


def _parse_csv(content: bytes) -> tuple[list[dict], str]:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(status_code=400, detail="Impossible de décoder le fichier (encodage non supporté)")

    for delimiter in (";", ",", "\t"):
        sample = text[:4096]
        if delimiter in sample:
            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            rows = list(reader)
            if rows:
                return rows, delimiter

    raise HTTPException(status_code=400, detail="CSV malformé ou vide — aucun séparateur détecté")


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(c)
    )


_CAMEL_CASE_BOUNDARY = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


def _normalize_col(col_name: str) -> str:
    """Normalize a CSV header for matching: split camelCase (e.g.
    "employeeId" -> "employee_Id"), strip accents, lowercase, and collapse
    any run of non-alphanumeric characters (spaces, hyphens, apostrophes,
    parentheses, units like '(%)', ...) into a single underscore.
    e.g. "Date d'entrée" -> "date_d_entree",
    "Taux d'absentéisme (%)" -> "taux_d_absenteisme",
    "contractType" -> "contract_type"."""
    text = _strip_accents(col_name).strip()
    text = _CAMEL_CASE_BOUNDARY.sub("_", text)
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def _norm_value(value) -> str:
    """Normalize a cell value for categorical comparisons (gender, contract
    type, job title): strip accents and lowercase."""
    return _strip_accents(str(value)).strip().lower()


def _tokens(col_name: str) -> set[str]:
    return {t for t in _normalize_col(col_name).split("_") if t}


# French articles/prepositions that _normalize_col turns into standalone
# tokens — including the elided forms "d'"/"l'" (e.g. "Date d'arrivée" ->
# "date_d_arrivee", "Jours d'arrêt" -> "jours_d_arret"). EMPLOYEE_ROLE_ALIASES
# entries are written WITHOUT these filler words (e.g. "date_arrivee",
# "jours_arret"), so headers must be stripped of them before the exact-match
# lookup in _detect_employee_roles — otherwise "date_d_arrivee" would fail to
# match the "date_arrivee" alias.
_FR_STOPWORDS = {"de", "du", "des", "la", "le", "les", "d", "l", "un", "une"}


def _strip_stopwords(normalized: str) -> str:
    tokens = [t for t in normalized.split("_") if t and t not in _FR_STOPWORDS]
    return "_".join(tokens)


# Fallback matching candidates, ordered from MOST to LEAST specific (i.e. by
# descending number of tokens in the key). This ensures e.g. a header like
# "Heures de formation par salarié" matches the 2-token key "heures_formation"
# (-> training hours) rather than the 1-token key "salarie" (-> headcount),
# even though both keys' tokens are technically subsets of the header.
_COLUMN_MAPPING_BY_SPECIFICITY = sorted(
    COLUMN_MAPPING.items(), key=lambda kv: kv[0].count("_"), reverse=True
)


def _match_column(col_name: str) -> Optional[tuple]:
    normalized = _normalize_col(col_name)
    if normalized in COLUMN_MAPPING:
        return COLUMN_MAPPING[normalized]
    # Match if the (possibly multi-word) mapping key is fully contained — as
    # whole words — within the column header. This still recognises e.g.
    # "nombre_de_femmes" → "femmes" or "taux_turnover_2024" → "turnover",
    # but no longer lets a generic column like "gender" be swallowed by a
    # more specific key such as "gender_gap" (its tokens {"gender","gap"}
    # are NOT a subset of {"gender"}).
    normalized_tokens = _tokens(col_name)
    for key, mapping in _COLUMN_MAPPING_BY_SPECIFICITY:
        key_tokens = _tokens(key)
        if key_tokens and key_tokens.issubset(normalized_tokens):
            return mapping
    return None


def _to_number(raw_val) -> Optional[float]:
    if raw_val is None:
        return None
    text = str(raw_val).strip().replace(",", ".").replace(" ", "").replace("\xa0", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


_FOUR_DIGIT_YEAR = re.compile(r"(19|20)\d{2}")


def _extract_year_from_date(raw_val) -> Optional[int]:
    """Extract a 4-digit year (19xx/20xx) from a date string, regardless of
    its position or the date format used — handles ISO ("2025-06-30"),
    French ("30/06/2025"), US ("06/30/2025"), dotted ("30.06.2025"), etc."""
    if raw_val is None:
        return None
    match = _FOUR_DIGIT_YEAR.search(str(raw_val).strip())
    return int(match.group(0)) if match else None


def _detect_employee_roles(columns: list[str]) -> dict[str, str]:
    """Map role names (employee_id, gender, salary, ...) to the actual CSV
    column that fulfils that role, for nominative/per-employee rosters."""
    roles: dict[str, str] = {}
    for col in columns:
        normalized = _strip_stopwords(_normalize_col(col))
        for role, aliases in EMPLOYEE_ROLE_ALIASES.items():
            if role not in roles and normalized in aliases:
                roles[role] = col
    return roles


def _aggregate_employee_rows(
    rows: list[dict],
    roles: dict[str, str],
    year_value: Optional[int],
) -> tuple[List["MappedRow"], List[str]]:
    """Compute ESRS S1 indicators by aggregating a nominative (one row per
    employee) roster — used when no pre-aggregated KPI columns were found."""
    notes: List[str] = []
    mapped: List[MappedRow] = []
    total = len(rows)

    employee_id_col = roles.get("employee_id")
    mapped.append(
        MappedRow(
            esrs_code="s1_workforce_total",
            esrs_label="Effectif total",
            unit="personnes",
            value=float(total),
            raw_column=employee_id_col or "(nombre de lignes)",
            year=year_value,
        )
    )

    gender_col = roles.get("gender")
    recognized_genders = 0
    if gender_col:
        women = men = 0
        for row in rows:
            g = _norm_value(row.get(gender_col, ""))
            if g in GENDER_FEMALE_VALUES:
                women += 1
            elif g in GENDER_MALE_VALUES:
                men += 1
        recognized_genders = women + men
        if recognized_genders:
            mapped.append(
                MappedRow(
                    esrs_code="s1_women_ratio",
                    esrs_label="Part femmes (effectif)",
                    unit="%",
                    value=round(women / recognized_genders * 100, 1),
                    raw_column=gender_col,
                    year=year_value,
                )
            )

        salary_col = roles.get("salary")
        if salary_col and recognized_genders:
            f_salaries: list[float] = []
            m_salaries: list[float] = []
            for row in rows:
                g = _norm_value(row.get(gender_col, ""))
                val = _to_number(row.get(salary_col))
                if val is None:
                    continue
                if g in GENDER_FEMALE_VALUES:
                    f_salaries.append(val)
                elif g in GENDER_MALE_VALUES:
                    m_salaries.append(val)
            if f_salaries and m_salaries:
                avg_f = sum(f_salaries) / len(f_salaries)
                avg_m = sum(m_salaries) / len(m_salaries)
                if avg_m:
                    mapped.append(
                        MappedRow(
                            esrs_code="s1_pay_gap",
                            esrs_label="Écart salarial F/H",
                            unit="%",
                            value=round((avg_m - avg_f) / avg_m * 100, 1),
                            raw_column=salary_col,
                            year=year_value,
                        )
                    )

        job_title_col = roles.get("job_title")
        if job_title_col and recognized_genders:
            mgmt_women = mgmt_total = 0
            for row in rows:
                title = _norm_value(row.get(job_title_col, ""))
                if not title or not any(kw in title for kw in MANAGEMENT_KEYWORDS):
                    continue
                g = _norm_value(row.get(gender_col, ""))
                if g not in GENDER_FEMALE_VALUES and g not in GENDER_MALE_VALUES:
                    continue
                mgmt_total += 1
                if g in GENDER_FEMALE_VALUES:
                    mgmt_women += 1
            if mgmt_total:
                mapped.append(
                    MappedRow(
                        esrs_code="s1_women_management",
                        esrs_label="Femmes encadrement",
                        unit="%",
                        value=round(mgmt_women / mgmt_total * 100, 1),
                        raw_column=job_title_col,
                        year=year_value,
                    )
                )

    contract_col = roles.get("contract_type")
    if contract_col:
        permanent = recognized = 0
        for row in rows:
            c = _norm_value(row.get(contract_col, ""))
            if not c:
                continue
            recognized += 1
            if any(kw in c for kw in PERMANENT_CONTRACT_KEYWORDS):
                permanent += 1
        if recognized:
            mapped.append(
                MappedRow(
                    esrs_code="s1_permanent_contracts",
                    esrs_label="Contrats CDI",
                    unit="%",
                    value=round(permanent / recognized * 100, 1),
                    raw_column=contract_col,
                    year=year_value,
                )
            )

    training_col = roles.get("training_hours")
    if training_col:
        hours = [_to_number(row.get(training_col)) for row in rows]
        hours = [h for h in hours if h is not None]
        if hours:
            mapped.append(
                MappedRow(
                    esrs_code="s1_training_hours_per_employee",
                    esrs_label="Heures formation/salarié",
                    unit="heures",
                    value=round(sum(hours) / len(hours), 1),
                    raw_column=training_col,
                    year=year_value,
                )
            )

    absence_col = roles.get("absence_days")
    if absence_col:
        days = [_to_number(row.get(absence_col)) for row in rows]
        days = [d for d in days if d is not None]
        if days:
            avg_days = sum(days) / len(days)
            mapped.append(
                MappedRow(
                    esrs_code="s1_absenteeism_rate",
                    esrs_label="Taux absentéisme",
                    unit="%",
                    value=round(avg_days / WORKING_DAYS_PER_YEAR * 100, 1),
                    raw_column=absence_col,
                    year=year_value,
                )
            )

    hire_col = roles.get("hire_date")
    if hire_col and year_value:
        new_hires = 0
        for row in rows:
            if _extract_year_from_date(row.get(hire_col)) == year_value:
                new_hires += 1
        if new_hires:
            mapped.append(
                MappedRow(
                    esrs_code="s1_new_hires",
                    esrs_label="Nouvelles embauches",
                    unit="personnes",
                    value=float(new_hires),
                    raw_column=hire_col,
                    year=year_value,
                )
            )

    exit_col = roles.get("exit_date")
    if exit_col and year_value and total:
        departures = 0
        for row in rows:
            if _extract_year_from_date(row.get(exit_col)) == year_value:
                departures += 1
        if departures:
            mapped.append(
                MappedRow(
                    esrs_code="s1_turnover_rate",
                    esrs_label="Taux de turnover",
                    unit="%",
                    value=round(departures / total * 100, 1),
                    raw_column=exit_col,
                    year=year_value,
                )
            )

    notes.append(
        f"Fichier détecté comme une liste nominative ({total} salarié"
        f"{'s' if total != 1 else ''}, 1 ligne = 1 collaborateur) — "
        f"{len(mapped)} indicateur{'s' if len(mapped) != 1 else ''} ESRS S1 "
        f"calculé{'s' if len(mapped) != 1 else ''} par agrégation automatique "
        "des données individuelles."
    )
    return mapped, notes


@router.post("/preview", response_model=HRPreviewResponse)
async def hr_import_preview(
    file: UploadFile = File(...),
    source: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    if source not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Source invalide. Valeurs acceptées : {', '.join(sorted(VALID_SOURCES))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Le fichier est vide")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")

    rows, _ = _parse_csv(content)
    if not rows:
        raise HTTPException(status_code=400, detail="Le fichier ne contient aucune ligne de données")

    columns = list(rows[0].keys())
    year_from_file = _detect_year_from_filename(file.filename)

    year_col = next(
        (c for c in columns if _normalize_col(c) in YEAR_COLUMNS),
        None,
    )

    notes: List[str] = []
    mapped_rows: List[MappedRow] = []
    unmapped_columns: List[str] = []
    warnings: List[str] = []

    # ── Decide UPFRONT whether this file is a nominative roster (one row =
    # one employee, e.g. a generic PayFit/Silae/Lucca export with
    # employee_id/gender/salary/... columns) or a pre-aggregated KPI file
    # (one row = one period, e.g. "Année;Effectifs;Taux d'absentéisme;...").
    # This MUST happen BEFORE any COLUMN_MAPPING matching: per-employee
    # headers like "Heures de formation" or "Jours d'absence" would
    # otherwise be misdetected by _match_column's fallback as the
    # pre-aggregated KPI keys "heures_formation"/"absence" (whose tokens are
    # a subset of theirs), producing one bogus "period" entry per employee
    # instead of a single aggregated indicator — and skipping aggregation
    # entirely for the rest of the file.
    roles = _detect_employee_roles(columns)
    gender_col = roles.get("gender")
    is_employee_roster = False
    if gender_col:
        sample = [
            _norm_value(r.get(gender_col, ""))
            for r in rows
            if str(r.get(gender_col, "")).strip()
        ]
        if sample and all(v in GENDER_FEMALE_VALUES or v in GENDER_MALE_VALUES for v in sample):
            is_employee_roster = True

    # A recognizable "employee_id"/"matricule"-like column is itself a
    # strong signal that the file is a nominative roster (1 row =
    # 1 employee), even if the gender column couldn't be matched —
    # we'll still derive whatever indicators are available (headcount,
    # training hours, absenteeism, ...).
    if not is_employee_roster and roles.get("employee_id"):
        is_employee_roster = True

    if is_employee_roster:
        mapped_rows, agg_notes = _aggregate_employee_rows(rows, roles, year_from_file)
        notes.extend(agg_notes)
        used_cols = set(roles.values())
        unmapped_columns = [
            c for c in columns
            if c not in used_cols and _normalize_col(c) not in YEAR_COLUMNS
        ]
    else:
        seen_data_cols: set[str] = set()
        for col in columns:
            if _normalize_col(col) in YEAR_COLUMNS:
                continue
            mapping = _match_column(col)
            if mapping is None:
                if col not in seen_data_cols:
                    unmapped_columns.append(col)
                seen_data_cols.add(col)

        for row in rows:
            year_value: Optional[int] = year_from_file
            if year_col and row.get(year_col):
                try:
                    year_value = int(str(row[year_col]).strip())
                except (ValueError, TypeError):
                    pass

            for col in columns:
                if _normalize_col(col) in YEAR_COLUMNS:
                    continue
                mapping = _match_column(col)
                if mapping is None:
                    continue
                raw_val = row.get(col, "")
                if raw_val is None or str(raw_val).strip() == "":
                    continue
                numeric = _to_number(raw_val)
                if numeric is None:
                    warnings.append(f"Valeur non numérique ignorée — colonne '{col}' : '{raw_val}'")
                    continue

                esrs_code, esrs_label, unit = mapping
                mapped_rows.append(
                    MappedRow(
                        esrs_code=esrs_code,
                        esrs_label=esrs_label,
                        unit=unit,
                        value=numeric,
                        raw_column=col,
                        year=year_value,
                    )
                )

    if not mapped_rows:
        warnings.append("Aucune colonne n'a pu être associée à un indicateur ESRS S1. Vérifiez les en-têtes du fichier.")

    return HRPreviewResponse(
        source=source,
        rows_parsed=len(rows),
        mapped_rows=mapped_rows,
        unmapped_columns=list(dict.fromkeys(unmapped_columns)),
        warnings=warnings,
        notes=notes,
    )


@router.post("/sync")
async def hr_import_sync(
    body: SyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.source not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail=f"Source invalide. Valeurs acceptées : {', '.join(sorted(VALID_SOURCES))}",
        )
    if not body.mapped_rows:
        raise HTTPException(status_code=400, detail="Aucune ligne à importer")

    period_start = date(body.year, 1, 1)
    period_end = date(body.year, 12, 31)
    data_source = f"csv_import_{body.source}"

    created = 0
    updated = 0

    for row in body.mapped_rows:
        result = await db.execute(
            select(DataEntry).where(
                and_(
                    DataEntry.tenant_id == current_user.tenant_id,
                    DataEntry.metric_name == row.esrs_code,
                    DataEntry.period_start == period_start,
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.value_numeric = row.value
            existing.unit = row.unit
            existing.data_source = data_source
            existing.category = "ESRS_S1"
            existing.metric_name = row.esrs_code
            existing.notes = row.esrs_label
            updated += 1
        else:
            entry = DataEntry(
                tenant_id=current_user.tenant_id,
                pillar="social",
                category="ESRS_S1",
                metric_name=row.esrs_code,
                value_numeric=row.value,
                unit=row.unit,
                period_start=period_start,
                period_end=period_end,
                data_source=data_source,
                notes=row.esrs_label,
                created_by=current_user.id,
            )
            db.add(entry)
            created += 1

    await db.commit()

    return {"created": created, "updated": updated, "total": created + updated, "year": body.year}


@router.get("/stats")
async def hr_import_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historique agrégé des indicateurs ESRS S1 pour le tableau de bord
    'Statistiques' de la page Import — une série temporelle par indicateur
    (esrs_code -> {année: valeur}), avec libellé/unité et la liste triée des
    années couvertes."""
    result = await db.execute(
        select(
            DataEntry.metric_name,
            DataEntry.unit,
            DataEntry.notes,
            DataEntry.value_numeric,
            DataEntry.period_start,
        ).where(
            and_(
                DataEntry.tenant_id == current_user.tenant_id,
                DataEntry.category == "ESRS_S1",
            )
        ).order_by(DataEntry.period_start)
    )

    years: set[int] = set()
    indicators: dict[str, dict] = {}
    for metric_name, unit, label, value, period_start in result.all():
        if value is None or period_start is None or not metric_name:
            continue
        year = period_start.year
        years.add(year)
        entry = indicators.setdefault(
            metric_name, {"label": label or metric_name, "unit": unit or "", "values": {}}
        )
        entry["values"][str(year)] = value
        if label:
            entry["label"] = label
        if unit:
            entry["unit"] = unit

    return {
        "has_data": bool(indicators),
        "years": sorted(years),
        "indicators": indicators,
    }
