#!/usr/bin/env python3
"""
ESG Flow — LinkedIn outreach helper.

Manual-first, automation-assisted. The script does NOT send anything to
LinkedIn directly — it only prepares personalized drafts that you copy-paste
yourself, keeping the workflow 100% compliant with LinkedIn's ToS.

Commands:
    init        Create folders + sample CSV.
    enrich      Find prospect emails via Snov.io free tier.
    drafts      Generate connection notes + DMs + relances per prospect.
    pipeline    Show today's actions (connections to send / follow-ups due).
    notion      Export the pipeline as a Notion-compatible CSV.
    stats       Show conversion funnel metrics.

Usage:
    python outreach.py init
    python outreach.py enrich
    python outreach.py drafts
    python outreach.py pipeline
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

import click
import requests
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader, select_autoescape
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

# ─── Setup ──────────────────────────────────────────────────────────────────
load_dotenv()
console = Console()

ROOT = Path(__file__).parent
TEMPLATES_DIR = ROOT / "templates"
DATA_DIR = ROOT / "data"
DRAFTS_DIR = DATA_DIR / "drafts"
SNOV_CACHE_FILE = DATA_DIR / ".snov_cache.json"

jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(default=False),
    trim_blocks=True,
    lstrip_blocks=True,
)


# ─── Configuration (.env) ──────────────────────────────────────────────────
@dataclass
class Config:
    sender_first_name: str = os.getenv("SENDER_FIRST_NAME", "Prénom")
    sender_last_name: str = os.getenv("SENDER_LAST_NAME", "Nom")
    sender_title: str = os.getenv("SENDER_TITLE", "Fondateur ESG Flow")
    calendly_link: str = os.getenv("CALENDLY_LINK", "https://calendly.com/your-handle/decouverte-esg")
    snov_user_id: str = os.getenv("SNOV_USER_ID", "")
    snov_api_secret: str = os.getenv("SNOV_API_SECRET", "")
    followup_day_1: int = int(os.getenv("DEFAULT_FOLLOWUP_DAY_1", "5"))
    followup_day_2: int = int(os.getenv("DEFAULT_FOLLOWUP_DAY_2", "12"))


CFG = Config()


# ─── Prospect data ─────────────────────────────────────────────────────────
ROLE_LABELS = {
    "RSE": "responsables RSE",
    "DAF": "DAF",
    "Risk": "Risk Managers",
    "DG": "dirigeants",
    "CSO": "Chief Sustainability Officers",
    "Compliance": "responsables conformité",
}

VALID_ROLES = set(ROLE_LABELS.keys())


@dataclass
class Prospect:
    """In-memory representation of a prospect row."""
    first_name: str
    last_name: str
    company: str
    linkedin_url: str
    role: str
    size: Optional[int] = None
    sector: str = ""
    csrd_wave: str = ""
    trigger: str = ""
    notes: str = ""
    email: str = ""
    status: str = "Liste"
    date_connection_sent: str = ""
    date_dm_sent: str = ""
    date_relance_1: str = ""
    date_relance_2: str = ""
    score_interet: int = 0
    verbatim_cle: str = ""

    @classmethod
    def from_row(cls, row: Dict[str, str]) -> "Prospect":
        # Tolerant parsing: drop unknown columns, coerce types.
        kwargs = {}
        valid_fields = {f for f in cls.__dataclass_fields__}
        for k, v in row.items():
            if k not in valid_fields:
                continue
            if k == "size" and v:
                try:
                    kwargs[k] = int(v)
                except ValueError:
                    kwargs[k] = None
            elif k == "score_interet" and v:
                try:
                    kwargs[k] = int(v)
                except ValueError:
                    kwargs[k] = 0
            else:
                kwargs[k] = v or ""
        # Defaults for required fields
        kwargs.setdefault("first_name", "")
        kwargs.setdefault("last_name", "")
        kwargs.setdefault("company", "")
        kwargs.setdefault("linkedin_url", "")
        kwargs.setdefault("role", "")
        return cls(**kwargs)

    def role_label(self) -> str:
        return ROLE_LABELS.get(self.role, "professionnels")

    def context(self, extra: Optional[Dict] = None) -> Dict:
        """Variables exposed to Jinja templates."""
        ctx = asdict(self)
        ctx["role_label"] = self.role_label()
        ctx["sender_first_name"] = CFG.sender_first_name
        ctx["sender_last_name"] = CFG.sender_last_name
        ctx["sender_title"] = CFG.sender_title
        ctx["calendly_link"] = CFG.calendly_link
        if extra:
            ctx.update(extra)
        return ctx


# ─── CSV I/O ───────────────────────────────────────────────────────────────
CSV_FIELDS = [
    "first_name", "last_name", "company", "linkedin_url",
    "role", "size", "sector", "csrd_wave", "trigger",
    "email", "status",
    "date_connection_sent", "date_dm_sent",
    "date_relance_1", "date_relance_2",
    "score_interet", "verbatim_cle", "notes",
]


def load_prospects(path: Path) -> List[Prospect]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [Prospect.from_row(row) for row in reader]


def save_prospects(prospects: List[Prospect], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for p in prospects:
            row = asdict(p)
            # serialize None as empty string
            writer.writerow({k: ("" if v is None else v) for k, v in row.items()})


# ─── Template selection ────────────────────────────────────────────────────
def select_connection_template(p: Prospect) -> str:
    """Pick the most relevant connection template for *p*."""
    t = (p.trigger or "").lower()
    if "warm intro" in t or "introduction" in t or "suggéré" in t or "mutuel" in t:
        return "connection_warm_intro.j2"
    if "post" in t or "linkedin" in t or "publication" in t or "interview" in t or "article" in t:
        return "connection_signal_post.j2"
    if "nomm" in t or "prise de poste" in t or "new role" in t or "nominée" in t:
        return "connection_new_role.j2"
    # Fallback by role
    by_role = {
        "RSE": "connection_rse.j2",
        "DAF": "connection_daf.j2",
        "Risk": "connection_risk.j2",
        "DG": "connection_dg.j2",
        "CSO": "connection_cso.j2",
        "Compliance": "connection_risk.j2",
    }
    return by_role.get(p.role, "connection_rse.j2")


def select_dm_template(p: Prospect) -> str:
    by_role = {
        "RSE": "dm_rse.j2",
        "DAF": "dm_daf.j2",
        "Risk": "dm_risk.j2",
        "DG": "dm_dg.j2",
        "CSO": "dm_cso.j2",
        "Compliance": "dm_risk.j2",
    }
    return by_role.get(p.role, "dm_rse.j2")


def render_template(name: str, ctx: Dict) -> str:
    return jinja_env.get_template(name).render(**ctx).strip()


# ─── Snov.io enrichment (free tier: 50/month) ───────────────────────────────
SNOV_API_BASE = "https://api.snov.io"
SNOV_TOKEN_URL = f"{SNOV_API_BASE}/v1/oauth/access_token"
SNOV_ADD_URL_TASK = f"{SNOV_API_BASE}/v1/add-url-for-search"
SNOV_GET_URL_TASK = f"{SNOV_API_BASE}/v1/get-emails-from-url"


def _load_snov_cache() -> Dict[str, str]:
    if not SNOV_CACHE_FILE.exists():
        return {}
    try:
        return json.loads(SNOV_CACHE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_snov_cache(cache: Dict[str, str]) -> None:
    SNOV_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    SNOV_CACHE_FILE.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def _snov_token() -> Optional[str]:
    if not (CFG.snov_user_id and CFG.snov_api_secret):
        return None
    try:
        r = requests.post(
            SNOV_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": CFG.snov_user_id,
                "client_secret": CFG.snov_api_secret,
            },
            timeout=15,
        )
        r.raise_for_status()
        return r.json().get("access_token")
    except (requests.RequestException, KeyError, ValueError) as exc:
        console.print(f"[red]Snov.io auth failed:[/red] {exc}")
        return None


def snov_find_email(linkedin_url: str, token: str) -> Optional[str]:
    """Submit a LinkedIn URL to Snov and poll for the result. Cached."""
    cache = _load_snov_cache()
    if linkedin_url in cache:
        return cache[linkedin_url] or None

    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: queue the URL
    try:
        r = requests.post(
            SNOV_ADD_URL_TASK,
            headers=headers,
            data={"url": linkedin_url},
            timeout=15,
        )
        r.raise_for_status()
    except requests.RequestException as exc:
        console.print(f"[red]Snov add-url failed for {linkedin_url}:[/red] {exc}")
        return None

    # Step 2: poll until ready (max ~20 s)
    email = ""
    for _ in range(10):
        time.sleep(2)
        try:
            r = requests.post(
                SNOV_GET_URL_TASK,
                headers=headers,
                data={"url": linkedin_url},
                timeout=15,
            )
            r.raise_for_status()
            data = r.json()
            if data.get("success") and data.get("data"):
                emails_list = data["data"].get("emails", [])
                if emails_list:
                    email = emails_list[0].get("email", "")
                    break
        except requests.RequestException:
            continue

    cache[linkedin_url] = email
    _save_snov_cache(cache)
    return email or None


# ─── Commands ──────────────────────────────────────────────────────────────
@click.group()
def cli():
    """ESG Flow — LinkedIn outreach helper (manual-first)."""
    pass


@cli.command()
def init():
    """Create folder structure + sample CSV. Idempotent."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)

    env_file = ROOT / ".env"
    env_example = ROOT / ".env.example"
    if not env_file.exists() and env_example.exists():
        env_file.write_text(env_example.read_text(encoding="utf-8"), encoding="utf-8")
        console.print(f"[green]Created[/green] {env_file.name} (edit it with your settings)")

    sample = DATA_DIR / "prospects_example.csv"
    target = DATA_DIR / "prospects.csv"
    if not target.exists() and sample.exists():
        target.write_text(sample.read_text(encoding="utf-8"), encoding="utf-8")
        console.print(f"[green]Created[/green] {target.relative_to(ROOT)} (edit it with your prospects)")

    console.print(Panel.fit(
        "[bold]Next steps:[/bold]\n"
        "1. Edit [cyan].env[/cyan] (sender info + Snov.io API keys)\n"
        "2. Edit [cyan]data/prospects.csv[/cyan] with your prospects\n"
        "3. Run [yellow]python outreach.py drafts[/yellow] to generate messages",
        title="ESG Flow Outreach — ready",
        border_style="green",
    ))


@cli.command()
@click.option("--input", "-i", "input_path", default="data/prospects.csv",
              help="Path to the prospects CSV.")
def enrich(input_path: str):
    """Look up prospect emails via Snov.io (free tier, cached)."""
    path = ROOT / input_path
    prospects = load_prospects(path)
    if not prospects:
        console.print(f"[red]No prospects found at {path}[/red]")
        sys.exit(1)

    if not (CFG.snov_user_id and CFG.snov_api_secret):
        console.print("[yellow]Snov.io API keys not configured in .env — skipping enrichment.[/yellow]")
        console.print("Sign up free at [cyan]https://app.snov.io[/cyan] then put credentials in .env")
        sys.exit(0)

    token = _snov_token()
    if not token:
        console.print("[red]Could not get Snov.io access token.[/red]")
        sys.exit(1)

    to_enrich = [p for p in prospects if not p.email and p.linkedin_url]
    if not to_enrich:
        console.print("[green]All prospects already have emails (or no LinkedIn URLs).[/green]")
        return

    console.print(f"Enriching {len(to_enrich)} prospect(s) via Snov.io…")
    found = 0
    with Progress(SpinnerColumn(), TextColumn("{task.description}")) as progress:
        task = progress.add_task("Searching emails…", total=len(to_enrich))
        for p in to_enrich:
            email = snov_find_email(p.linkedin_url, token)
            if email:
                p.email = email
                found += 1
            progress.advance(task)

    save_prospects(prospects, path)
    console.print(f"[green]Found {found}/{len(to_enrich)} emails.[/green] Saved to {path.relative_to(ROOT)}")


@cli.command()
@click.option("--input", "-i", "input_path", default="data/prospects.csv")
@click.option("--only-status", default="Liste",
              help="Only generate drafts for prospects with this status. Use 'all' for everyone.")
def drafts(input_path: str, only_status: str):
    """Generate personalized message drafts (.md per prospect)."""
    path = ROOT / input_path
    prospects = load_prospects(path)
    if not prospects:
        console.print(f"[red]No prospects found at {path}[/red]")
        sys.exit(1)

    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)

    targets = (
        prospects if only_status == "all"
        else [p for p in prospects if p.status == only_status]
    )
    if not targets:
        console.print(f"[yellow]No prospects with status='{only_status}'.[/yellow]")
        return

    console.print(f"Generating drafts for {len(targets)} prospect(s)…")
    by_role: Dict[str, int] = {}

    for p in targets:
        if p.role not in VALID_ROLES:
            console.print(f"[yellow]Skipping {p.first_name} {p.last_name} — unknown role '{p.role}'[/yellow]")
            continue
        ctx = p.context()
        try:
            connection_msg = render_template(select_connection_template(p), ctx)
            dm_msg = render_template(select_dm_template(p), ctx)
            relance_1 = render_template("relance_j5.j2", ctx)
            relance_2 = render_template("relance_j12.j2", ctx)
        except Exception as exc:  # pragma: no cover
            console.print(f"[red]Template error for {p.first_name}:[/red] {exc}")
            continue

        # Validate length of connection note (LinkedIn limits: 300 chars)
        conn_len = len(connection_msg)
        warn_conn = "⚠ TROP LONG" if conn_len > 300 else "✓"

        slug = f"{p.first_name.lower().replace(' ', '-')}-{p.last_name.lower().replace(' ', '-')}-{p.company.lower().replace(' ', '-')[:20]}"
        draft_file = DRAFTS_DIR / f"{slug}.md"
        draft_file.write_text(
            f"# {p.first_name} {p.last_name} — {p.company}\n\n"
            f"**Rôle :** {p.role} ({p.role_label()})  \n"
            f"**Taille :** {p.size or 'N/A'} · **Secteur :** {p.sector or 'N/A'} · **CSRD vague :** {p.csrd_wave or 'N/A'}  \n"
            f"**LinkedIn :** {p.linkedin_url}  \n"
            f"**Email :** {p.email or '(non enrichi)'}  \n"
            f"**Trigger :** {p.trigger or '(aucun)'}\n\n"
            f"---\n\n"
            f"## 1. Note de connexion ({conn_len}/300 caractères) {warn_conn}\n\n"
            f"```\n{connection_msg}\n```\n\n"
            f"## 2. DM post-connexion ({len(dm_msg)} caractères)\n\n"
            f"```\n{dm_msg}\n```\n\n"
            f"## 3. Relance J+{CFG.followup_day_1}\n\n"
            f"```\n{relance_1}\n```\n\n"
            f"## 4. Relance J+{CFG.followup_day_2} (dernière)\n\n"
            f"```\n{relance_2}\n```\n",
            encoding="utf-8",
        )
        by_role[p.role] = by_role.get(p.role, 0) + 1

    # Summary table
    table = Table(title="Drafts générés", box=box.SIMPLE)
    table.add_column("Rôle", style="cyan")
    table.add_column("Label")
    table.add_column("Nombre", justify="right", style="green")
    for role, count in sorted(by_role.items()):
        table.add_row(role, ROLE_LABELS.get(role, "?"), str(count))
    console.print(table)
    console.print(f"[green]Drafts saved to[/green] {DRAFTS_DIR.relative_to(ROOT)}/")


@cli.command()
@click.option("--input", "-i", "input_path", default="data/prospects.csv")
def pipeline(input_path: str):
    """Show today's actions: connections to send + follow-ups due."""
    path = ROOT / input_path
    prospects = load_prospects(path)
    if not prospects:
        console.print(f"[red]No prospects at {path}[/red]")
        return

    today = datetime.now(timezone.utc).date()

    def _date_due(date_str: str, offset_days: int) -> bool:
        if not date_str:
            return False
        try:
            base = datetime.fromisoformat(date_str).date()
        except ValueError:
            return False
        return base + timedelta(days=offset_days) <= today

    to_connect = [p for p in prospects if p.status == "Liste"]
    to_dm = [p for p in prospects if p.status == "Connecté"]
    to_relance_1 = [p for p in prospects
                    if p.status == "DM envoyé"
                    and _date_due(p.date_dm_sent, CFG.followup_day_1)
                    and not p.date_relance_1]
    to_relance_2 = [p for p in prospects
                    if p.status == "Relance 1"
                    and _date_due(p.date_relance_1, CFG.followup_day_2 - CFG.followup_day_1)
                    and not p.date_relance_2]

    def _print_bucket(title: str, bucket: List[Prospect], color: str):
        if not bucket:
            return
        console.print(f"\n[bold {color}]{title} — {len(bucket)} prospect(s)[/bold {color}]")
        t = Table(box=box.SIMPLE)
        t.add_column("Nom", style="cyan")
        t.add_column("Entreprise")
        t.add_column("Rôle")
        t.add_column("Trigger", style="dim")
        for p in bucket:
            t.add_row(
                f"{p.first_name} {p.last_name}",
                p.company,
                p.role,
                (p.trigger[:35] + "…") if len(p.trigger) > 35 else p.trigger,
            )
        console.print(t)

    _print_bucket("📋 Connexions à envoyer", to_connect, "blue")
    _print_bucket("💬 DM à envoyer (connexions acceptées)", to_dm, "magenta")
    _print_bucket(f"🔄 Relance J+{CFG.followup_day_1} due", to_relance_1, "yellow")
    _print_bucket(f"🔁 Relance J+{CFG.followup_day_2} due", to_relance_2, "red")

    if not (to_connect or to_dm or to_relance_1 or to_relance_2):
        console.print(Panel.fit(
            "Aucune action à effectuer aujourd'hui.\n"
            "Ajoute des prospects dans data/prospects.csv pour démarrer.",
            border_style="green",
        ))


@cli.command()
@click.option("--input", "-i", "input_path", default="data/prospects.csv")
@click.option("--output", "-o", "output_path", default="data/pipeline_notion.csv")
def notion(input_path: str, output_path: str):
    """Export pipeline as a Notion-compatible CSV."""
    path = ROOT / input_path
    out_path = ROOT / output_path
    prospects = load_prospects(path)
    if not prospects:
        console.print(f"[red]No prospects at {path}[/red]")
        return

    notion_fields = [
        "Nom", "Entreprise", "Taille", "Secteur", "Fonction",
        "Vague CSRD", "LinkedIn URL", "Email", "Trigger",
        "Connexion envoyée", "DM envoyé", "Relance 1", "Relance 2",
        "Status", "Score intérêt", "Verbatim clé", "Notes",
    ]

    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=notion_fields)
        writer.writeheader()
        for p in prospects:
            writer.writerow({
                "Nom": f"{p.first_name} {p.last_name}".strip(),
                "Entreprise": p.company,
                "Taille": p.size or "",
                "Secteur": p.sector,
                "Fonction": p.role,
                "Vague CSRD": p.csrd_wave,
                "LinkedIn URL": p.linkedin_url,
                "Email": p.email,
                "Trigger": p.trigger,
                "Connexion envoyée": p.date_connection_sent,
                "DM envoyé": p.date_dm_sent,
                "Relance 1": p.date_relance_1,
                "Relance 2": p.date_relance_2,
                "Status": p.status,
                "Score intérêt": "⭐" * p.score_interet,
                "Verbatim clé": p.verbatim_cle,
                "Notes": p.notes,
            })

    console.print(f"[green]Exported {len(prospects)} prospects to[/green] {out_path.relative_to(ROOT)}")
    console.print("Import in Notion: New → Import → CSV → choose this file → map columns.")


@cli.command()
@click.option("--input", "-i", "input_path", default="data/prospects.csv")
def stats(input_path: str):
    """Show conversion funnel metrics."""
    path = ROOT / input_path
    prospects = load_prospects(path)
    if not prospects:
        console.print(f"[red]No prospects at {path}[/red]")
        return

    total = len(prospects)
    counters: Dict[str, int] = {}
    for p in prospects:
        counters[p.status] = counters.get(p.status, 0) + 1

    funnel_order = [
        "Liste", "Connexion envoyée", "Connecté", "DM envoyé",
        "Relance 1", "Relance 2", "Réponse positive", "Booké",
        "Entretien fait", "Cold", "NoFit",
    ]

    table = Table(title=f"Pipeline funnel ({total} prospects)", box=box.SIMPLE_HEAVY)
    table.add_column("Statut", style="cyan")
    table.add_column("Nombre", justify="right")
    table.add_column("% du total", justify="right", style="dim")

    for status in funnel_order:
        count = counters.get(status, 0)
        if count == 0:
            continue
        table.add_row(status, str(count), f"{count / total * 100:.0f}%")

    console.print(table)

    # Conversion ratios
    connected = sum(counters.get(s, 0) for s in
                    ["Connecté", "DM envoyé", "Relance 1", "Relance 2",
                     "Réponse positive", "Booké", "Entretien fait"])
    booked = counters.get("Booké", 0) + counters.get("Entretien fait", 0)
    interviewed = counters.get("Entretien fait", 0)

    sent = sum(counters.get(s, 0) for s in
               ["Connexion envoyée", "Connecté", "DM envoyé", "Relance 1", "Relance 2",
                "Réponse positive", "Booké", "Entretien fait", "Cold", "NoFit"])
    if sent:
        console.print(f"\n[bold]Conversion :[/bold]")
        console.print(f"  Acceptation     : {connected / sent * 100:.0f}% ({connected}/{sent})")
        console.print(f"  Booking         : {booked / sent * 100:.0f}% ({booked}/{sent})")
        console.print(f"  Entretiens faits: {interviewed / sent * 100:.0f}% ({interviewed}/{sent})")


if __name__ == "__main__":
    cli()
