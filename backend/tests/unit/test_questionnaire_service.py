"""Questionnaires clients : extraction, pré-remplissage garde-fous, export."""
import io
import json

import openpyxl
import pytest

from app.services import gaia_service as gaia
from app.services import questionnaire_service as qs

FACTS = [
    {"id": "F1", "label": "Émissions scope 1", "value": "12.5", "unit": "tCO2e", "period": "2025", "verified": True, "origin": "Saisie ESGFlow"},
    {"id": "F2", "label": "Effectif", "value": "240", "unit": "salariés", "period": None, "verified": False, "origin": "Profil de l'organisation"},
]


def questions(*texts):
    return [{"id": f"q{i}", "section": None, "text": t, "answer_type": "text", "answer": None, "status": "to_complete",
             "confidence": None, "sources": [], "note": None} for i, t in enumerate(texts, start=1)]


def test_parse_questions_assigns_ids_dedupes_and_ignores_garbage():
    raw = json.dumps({"client": "Grand Groupe", "questions": [
        {"section": "Climat", "text": "Quelles sont vos émissions de scope 1 ?", "answer_type": "number"},
        {"text": "Quelles sont vos émissions de scope 1 ?"},          # doublon
        {"text": "ok"},                                                  # trop court
        "pas un objet",
        {"text": "Avez-vous une politique anticorruption ?", "answer_type": "inconnu"},
    ]})
    out = qs.parse_questions(raw)
    assert out["client"] == "Grand Groupe"
    assert [q["id"] for q in out["questions"]] == ["q1", "q2"]
    assert out["questions"][1]["answer_type"] == "text"   # type inconnu ramené à « text »


def test_numbers_understand_french_and_english_formats():
    assert 1234.5 in qs._numbers("1 234,5 tCO2e")
    assert 1234.5 in qs._numbers("1,234.5 t")
    assert 240.0 in qs._numbers("240 salariés")


def test_answer_without_valid_source_is_dropped():
    qlist = questions("Effectif ?", "Scope 1 ?", "Politique anticorruption ?", "Eau ?")
    ai = {
        "q1": {"answer": "240 salariés", "fact_ids": ["F2"], "confidence": "high"},
        "q2": {"answer": "12,5 tCO2e", "fact_ids": [], "confidence": "high"},            # aucune source
        "q3": {"answer": "Oui, nous en avons une", "fact_ids": ["F99"], "confidence": "high"},  # source inventée
        "q4": {"answer": None, "fact_ids": [], "confidence": "low"},
    }
    out = {q["id"]: q for q in qs.merge_prefill(qlist, ai, FACTS)}
    assert out["q1"]["status"] == "prefilled" and out["q1"]["sources"][0]["label"] == "Effectif"
    assert out["q2"]["status"] == out["q3"]["status"] == out["q4"]["status"] == "to_complete"
    assert out["q2"]["answer"] is None and out["q3"]["sources"] == []


def test_invented_number_is_dropped_even_with_a_real_source():
    qlist = questions("Scope 1 ?")
    ai = {"q1": {"answer": "Nos émissions sont de 99 tCO2e", "fact_ids": ["F1"], "confidence": "high"}}
    assert qs.merge_prefill(qlist, ai, FACTS)[0]["status"] == "to_complete"


def test_unverified_source_caps_confidence():
    ai = {"q1": {"answer": "240 salariés", "fact_ids": ["F2"], "confidence": "high"}}
    assert qs.merge_prefill(questions("Effectif ?"), ai, FACTS)[0]["confidence"] == "medium"
    ai = {"q1": {"answer": "12,5 tCO2e", "fact_ids": ["F1"], "confidence": "high"}}
    assert qs.merge_prefill(questions("Scope 1 ?"), ai, FACTS)[0]["confidence"] == "high"


@pytest.mark.asyncio
async def test_prefill_calls_ai_in_batches_and_applies_guards(monkeypatch):
    monkeypatch.setattr(gaia, "_client", lambda: object())
    calls = []

    async def fake_chat(client, system, user, **kw):
        calls.append(user)
        return json.dumps({"answers": [{"id": "q1", "answer": "12,5 tCO2e", "fact_ids": ["F1"], "confidence": "high"},
                                       {"id": "q2", "answer": "Oui", "fact_ids": [], "confidence": "high"}]})

    monkeypatch.setattr(gaia, "_chat", fake_chat)
    out = await qs.prefill(questions("Scope 1 ?", "Politique ?"), FACTS)
    assert [q["status"] for q in out] == ["prefilled", "to_complete"]
    assert "FAITS" in calls[0] and "DEBUT_DU_RAPPORT" in calls[0]   # le questionnaire est traité comme donnée non fiable


@pytest.mark.asyncio
async def test_prefill_without_facts_makes_no_ai_call(monkeypatch):
    def boom():
        raise AssertionError("aucun appel IA attendu sans données")
    monkeypatch.setattr(gaia, "_client", boom)
    out = await qs.prefill(questions("Scope 1 ?"), [])
    assert out[0]["status"] == "to_complete"


def test_excel_questionnaire_is_read_row_by_row_and_exported_back():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "RSE"
    ws.append(["Rubrique", "Question", "Réponse"])
    ws.append(["Climat", "Quel est votre bilan carbone scope 1 ?", None])
    buf = io.BytesIO()
    wb.save(buf)
    text = qs.extract_questionnaire_text("questionnaire.xlsx", buf.getvalue())
    assert "[RSE · L2] Climat | Quel est votre bilan carbone scope 1 ?" in text

    out = qs.merge_prefill(questions("Scope 1 ?"), {"q1": {"answer": "12,5 tCO2e", "fact_ids": ["F1"], "confidence": "high"}}, FACTS)
    xlsx = qs.export_xlsx("questionnaire.xlsx", "Grand Groupe", out)
    sheet = openpyxl.load_workbook(io.BytesIO(xlsx)).active
    rows = list(sheet.iter_rows(values_only=True))
    assert rows[2][:5] == ("N°", "Rubrique", "Question", "Réponse", "Statut")
    assert rows[3][3] == "12,5 tCO2e" and "Émissions scope 1 = 12.5 tCO2e (2025)" in rows[3][5]


def test_unsupported_format_is_refused_with_a_clear_message():
    with pytest.raises(gaia.GaiaError):
        qs.extract_questionnaire_text("malware.exe", b"MZ")
