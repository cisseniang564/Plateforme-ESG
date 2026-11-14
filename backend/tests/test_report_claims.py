"""Les rapports ne doivent pas affirmer une conformité ou un audit non établis."""
from pathlib import Path

SRC = (Path(__file__).resolve().parents[1] / "app" / "services" / "report_service.py").read_text(encoding="utf-8")


def test_no_unverifiable_compliance_claims():
    for claim in (
        "auto-déclarée et auditée",
        "Rapport de durabilité conforme aux exigences CSRD / ESRS",
        "Ce rapport est conforme aux standards internationaux",
        "conformes aux exigences ESRS E1-6",
    ):
        assert claim not in SRC, claim
