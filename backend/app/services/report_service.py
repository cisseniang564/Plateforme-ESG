"""
Report Service - Professional PDF reports (CSRD/ESG design)
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics.charts.piecharts import Pie
from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry
from app.models.esg_score import ESGScore
from app.models.organization import Organization

# ─── Color Palette ────────────────────────────────────────────────────────────
C_NAVY   = colors.HexColor('#0f172a')
C_GREEN  = colors.HexColor('#059669')
C_GREEN2 = colors.HexColor('#d1fae5')
C_BLUE   = colors.HexColor('#2563eb')
C_BLUE2  = colors.HexColor('#dbeafe')
C_PURPLE = colors.HexColor('#7c3aed')
C_PURPLE2= colors.HexColor('#ede9fe')
C_GRAY   = colors.HexColor('#6b7280')
C_LGRAY  = colors.HexColor('#f3f4f6')
C_MGRAY  = colors.HexColor('#e5e7eb')
C_WHITE  = colors.white
C_AMBER  = colors.HexColor('#d97706')
C_AMBER2 = colors.HexColor('#fef3c7')
C_RED    = colors.HexColor('#dc2626')

# ESRS Section definitions
ESRS_SECTIONS = [
    # Environmental
    {'code': 'E1', 'label': 'Changement climatique',      'pillar': 'environmental', 'color': C_GREEN},
    {'code': 'E2', 'label': 'Pollution',                   'pillar': 'environmental', 'color': C_GREEN},
    {'code': 'E3', 'label': 'Eau et ressources marines',   'pillar': 'environmental', 'color': C_GREEN},
    {'code': 'E4', 'label': 'Biodiversité',                'pillar': 'environmental', 'color': C_GREEN},
    {'code': 'E5', 'label': 'Utilisation des ressources',  'pillar': 'environmental', 'color': C_GREEN},
    # Social
    {'code': 'S1', 'label': 'Effectifs propres',           'pillar': 'social', 'color': C_BLUE},
    {'code': 'S2', 'label': 'Travailleurs chaîne de valeur','pillar': 'social', 'color': C_BLUE},
    {'code': 'S3', 'label': 'Communautés affectées',       'pillar': 'social', 'color': C_BLUE},
    {'code': 'S4', 'label': 'Consommateurs',               'pillar': 'social', 'color': C_BLUE},
    # Governance
    {'code': 'G1', 'label': 'Conduite des affaires',       'pillar': 'governance', 'color': C_PURPLE},
]

PAGE_W, PAGE_H = A4


def _hex(c):
    """Return hex string from reportlab color."""
    return '#%02x%02x%02x' % (int(c.red*255), int(c.green*255), int(c.blue*255))


def _make_header_footer(report_title: str, year: int):
    """Return onFirstPage / onLaterPages callbacks for SimpleDocTemplate."""
    w, h = PAGE_W, PAGE_H
    gen_date = datetime.now().strftime('%d/%m/%Y')

    def later_pages(canvas, doc):
        canvas.saveState()
        # Green top bar
        canvas.setFillColor(C_GREEN)
        canvas.rect(0, h - 12*mm, w, 12*mm, fill=1, stroke=0)
        # Logo
        canvas.setFillColor(C_WHITE)
        canvas.setFont('Helvetica-Bold', 10)
        canvas.drawString(20*mm, h - 8*mm, 'ESGFlow')
        # Title
        canvas.setFont('Helvetica', 8)
        canvas.drawCentredString(w / 2, h - 8*mm, report_title[:65])
        # Page number
        canvas.drawRightString(w - 20*mm, h - 8*mm, f'Page {doc.page}')
        # Footer line
        canvas.setStrokeColor(C_MGRAY)
        canvas.setLineWidth(0.5)
        canvas.line(20*mm, 15*mm, w - 20*mm, 15*mm)
        canvas.setFillColor(C_GRAY)
        canvas.setFont('Helvetica', 7)
        canvas.drawString(20*mm, 9*mm,
                          f'© {year} ESGFlow · Confidentiel · Généré le {gen_date}')
        canvas.drawRightString(w - 20*mm, 9*mm, 'CSRD · ESRS · GRI · TCFD')
        canvas.restoreState()

    def first_page(canvas, doc):
        pass  # Cover page has its own design (flowables)

    return first_page, later_pages


class ReportService:
    """Service for generating professional ESG reports"""

    REPORT_TYPES = {
        'executive': {'name': 'Rapport Exécutif', 'description': 'Vue d\'ensemble pour la direction'},
        'detailed':  {'name': 'Rapport Détaillé',  'description': 'Analyse complète'},
        'csrd':      {'name': 'Rapport CSRD',      'description': 'Conforme directive européenne'},
        'gri':       {'name': 'Rapport GRI',       'description': 'Standards GRI 2021'},
        'tcfd':      {'name': 'Rapport TCFD',      'description': 'Risques climatiques'},
        'sfdr':      {'name': 'Rapport SFDR',      'description': 'Produits financiers durables — données PAI & taxonomie UE'},
        'carbon':    {'name': 'Bilan Carbone ADEME', 'description': 'Émissions GES Scopes 1, 2, 3 selon méthode ADEME/GHG Protocol'},
        'dpef':      {'name': 'DPEF',              'description': 'Déclaration de performance extra-financière — Art. L.225-102-1'},
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_report(
        self,
        tenant_id: UUID,
        report_type: str,
        organization_id: Optional[UUID] = None,
        period: str = 'annual',
        year: Optional[int] = None,
        format: str = 'pdf'
    ) -> bytes:
        if report_type not in self.REPORT_TYPES:
            raise ValueError(f"Unknown report type: {report_type}")

        _year = year or datetime.now().year
        data = await self._collect_data(tenant_id, organization_id, year)

        if format == 'pdf':
            return await self._generate_pdf(report_type, data, _year)
        elif format == 'excel':
            return self._generate_excel(report_type, data, _year)
        elif format == 'word':
            return self._generate_word(report_type, data, _year)
        elif format == 'json':
            import json as _json
            return _json.dumps({
                'report_type': report_type,
                'year': _year,
                'org_name': data.get('org_name'),
                'stats': data['stats'],
                'sections': {
                    code: [
                        {'metric': e['metric_name'], 'value': str(e['value']), 'unit': e['unit'], 'status': e['verification_status']}
                        for e in entries
                    ]
                    for code, entries in data['by_section'].items()
                },
            }, ensure_ascii=False, indent=2).encode('utf-8')
        else:
            raise ValueError(f"Unsupported format: {format}")

    # ─── Excel Export ─────────────────────────────────────────────────────────

    def _generate_excel(self, report_type: str, data: Dict[str, Any], year: int) -> bytes:
        """Generate a multi-sheet CSRD Excel report using openpyxl."""
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        stats = data['stats']
        org_name = data.get('org_name', 'Organisation')
        by_section = data.get('by_section', {})
        entries = data.get('entries', {})

        # ── Color palette ──
        GREEN  = '059669'; GREEN_L  = 'D1FAE5'
        BLUE   = '2563EB'; BLUE_L   = 'DBEAFE'
        PURPLE = '7C3AED'; PURPLE_L = 'EDE9FE'
        NAVY   = '0F172A'; GRAY     = '6B7280'
        AMBER  = 'D97706'; AMBER_L  = 'FEF3C7'
        RED    = 'DC2626'; WHITE    = 'FFFFFF'
        LGRAY  = 'F3F4F6'

        def _fill(hex_color):
            return PatternFill('solid', fgColor=hex_color)

        def _font(bold=False, color=NAVY, size=10):
            return Font(bold=bold, color=color, size=size, name='Calibri')

        def _border():
            thin = Side(style='thin', color='E5E7EB')
            return Border(left=thin, right=thin, top=thin, bottom=thin)

        def _header_row(ws, row, values, fill_color, font_color=WHITE, bold=True):
            for col, val in enumerate(values, 1):
                c = ws.cell(row=row, column=col, value=val)
                c.fill = _fill(fill_color)
                c.font = Font(bold=bold, color=font_color, size=10, name='Calibri')
                c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
                c.border = _border()

        # ══════════════════════════════════════════
        # Sheet 1 — Résumé exécutif
        # ══════════════════════════════════════════
        ws_summary = wb.active
        ws_summary.title = 'Résumé exécutif'
        ws_summary.sheet_view.showGridLines = False
        ws_summary.column_dimensions['A'].width = 30
        ws_summary.column_dimensions['B'].width = 25
        ws_summary.column_dimensions['C'].width = 20

        # Title block
        ws_summary.merge_cells('A1:C1')
        c = ws_summary['A1']
        c.value = f'Rapport CSRD — {org_name} — {year}'
        c.font = Font(bold=True, color=WHITE, size=14, name='Calibri')
        c.fill = _fill(NAVY)
        c.alignment = Alignment(horizontal='center', vertical='center')
        ws_summary.row_dimensions[1].height = 36

        ws_summary.merge_cells('A2:C2')
        c = ws_summary['A2']
        c.value = f'Conforme ESRS 2024 — Généré le {datetime.now().strftime("%d/%m/%Y")} — ESGFlow'
        c.font = Font(color=GRAY, size=9, name='Calibri')
        c.fill = _fill(LGRAY)
        c.alignment = Alignment(horizontal='center')
        ws_summary.row_dimensions[2].height = 20

        kpis = [
            ('Score ESG Global', f'{stats["score"]}/100', GREEN),
            ('Indicateurs collectés', str(stats['total_entries']), BLUE),
            ('Vérifiés', str(stats['verified_count']), GREEN),
            ('En attente', str(stats['pending_count']), AMBER),
            ('Couverture Environnement', f'{stats["by_pillar"]["environmental"]} indicateurs', GREEN),
            ('Couverture Social', f'{stats["by_pillar"]["social"]} indicateurs', BLUE),
            ('Couverture Gouvernance', f'{stats["by_pillar"]["governance"]} indicateurs', PURPLE),
        ]

        ws_summary.row_dimensions[3].height = 12
        for i, (label, value, color) in enumerate(kpis, start=4):
            ws_summary.cell(row=i, column=1, value=label).font = _font(bold=True)
            ws_summary.cell(row=i, column=1).fill = _fill(LGRAY)
            ws_summary.cell(row=i, column=1).border = _border()
            c_val = ws_summary.cell(row=i, column=2, value=value)
            c_val.font = Font(bold=True, color=color, size=12, name='Calibri')
            c_val.alignment = Alignment(horizontal='center')
            c_val.border = _border()
            ws_summary.merge_cells(f'C{i}:C{i}')
            ws_summary.row_dimensions[i].height = 22

        # ══════════════════════════════════════════
        # Sheet 2 — Données ESRS (all sections)
        # ══════════════════════════════════════════
        ws_esrs = wb.create_sheet('Données ESRS')
        ws_esrs.sheet_view.showGridLines = False
        ws_esrs.freeze_panes = 'A2'
        ws_esrs.column_dimensions['A'].width = 8
        ws_esrs.column_dimensions['B'].width = 35
        ws_esrs.column_dimensions['C'].width = 18
        ws_esrs.column_dimensions['D'].width = 12
        ws_esrs.column_dimensions['E'].width = 12
        ws_esrs.column_dimensions['F'].width = 20

        _header_row(ws_esrs, 1, ['Section', 'Indicateur', 'Valeur', 'Unité', 'Catégorie', 'Statut'], NAVY)
        ws_esrs.row_dimensions[1].height = 22

        pillar_colors = {
            'environmental': (GREEN, GREEN_L),
            'social':        (BLUE,  BLUE_L),
            'governance':    (PURPLE, PURPLE_L),
        }
        section_pillar_map = {s['code']: s['pillar'] for s in ESRS_SECTIONS}

        row = 2
        for sec in ESRS_SECTIONS:
            sec_entries = by_section.get(sec['code'], [])
            pillar = section_pillar_map.get(sec['code'], 'environmental')
            main_color, light_color = pillar_colors.get(pillar, (GREEN, GREEN_L))

            if not sec_entries:
                ws_esrs.cell(row=row, column=1, value=sec['code']).fill = _fill(AMBER_L)
                ws_esrs.cell(row=row, column=1).font = _font(bold=True, color=AMBER)
                ws_esrs.cell(row=row, column=1).border = _border()
                c = ws_esrs.cell(row=row, column=2, value='Aucune donnée collectée')
                c.fill = _fill(AMBER_L)
                c.font = Font(italic=True, color=AMBER, size=9, name='Calibri')
                c.border = _border()
                for col in range(3, 7):
                    ws_esrs.cell(row=row, column=col).fill = _fill(AMBER_L)
                    ws_esrs.cell(row=row, column=col).border = _border()
                row += 1
                continue

            for j, entry in enumerate(sec_entries):
                bg = light_color if j % 2 == 0 else WHITE
                ws_esrs.cell(row=row, column=1, value=sec['code'] if j == 0 else '').fill = _fill(main_color if j == 0 else bg)
                ws_esrs.cell(row=row, column=1).font = _font(bold=(j == 0), color=WHITE if j == 0 else NAVY)
                ws_esrs.cell(row=row, column=1).border = _border()
                ws_esrs.cell(row=row, column=2, value=str(entry.get('metric_name', ''))[:60]).fill = _fill(bg)
                ws_esrs.cell(row=row, column=2).border = _border()
                ws_esrs.cell(row=row, column=3, value=str(entry.get('value', '—'))).fill = _fill(bg)
                ws_esrs.cell(row=row, column=3).alignment = Alignment(horizontal='center')
                ws_esrs.cell(row=row, column=3).border = _border()
                ws_esrs.cell(row=row, column=4, value=str(entry.get('unit', ''))).fill = _fill(bg)
                ws_esrs.cell(row=row, column=4).alignment = Alignment(horizontal='center')
                ws_esrs.cell(row=row, column=4).border = _border()
                ws_esrs.cell(row=row, column=5, value=str(entry.get('category', ''))).fill = _fill(bg)
                ws_esrs.cell(row=row, column=5).border = _border()
                status = entry.get('verification_status', 'pending')
                status_label = {'verified': '✓ Vérifié', 'pending': '⏳ En attente', 'rejected': '✗ Rejeté'}.get(status, status)
                status_color = GREEN if status == 'verified' else (AMBER if status == 'pending' else RED)
                ws_esrs.cell(row=row, column=6, value=status_label).fill = _fill(bg)
                ws_esrs.cell(row=row, column=6).font = Font(color=status_color, size=9, name='Calibri')
                ws_esrs.cell(row=row, column=6).alignment = Alignment(horizontal='center')
                ws_esrs.cell(row=row, column=6).border = _border()
                ws_esrs.row_dimensions[row].height = 18
                row += 1

        # ══════════════════════════════════════════
        # Sheet 3 — Gap Analysis
        # ══════════════════════════════════════════
        ws_gap = wb.create_sheet('Gap Analysis')
        ws_gap.sheet_view.showGridLines = False
        ws_gap.freeze_panes = 'A2'
        ws_gap.column_dimensions['A'].width = 10
        ws_gap.column_dimensions['B'].width = 28
        ws_gap.column_dimensions['C'].width = 12
        ws_gap.column_dimensions['D'].width = 14
        ws_gap.column_dimensions['E'].width = 16
        ws_gap.column_dimensions['F'].width = 32

        _header_row(ws_gap, 1, ['Code', 'Section ESRS', 'Indicateurs', 'Couverture %', 'Statut', 'Action recommandée'], NAVY)
        ws_gap.row_dimensions[1].height = 22

        for i, sec in enumerate(ESRS_SECTIONS):
            row_num = i + 2
            count = len(by_section.get(sec['code'], []))
            pct = min(round(count / 5 * 100), 100) if count else 0

            if pct >= 80:
                status, action, row_color = '✓ Prêt', 'Maintenir & vérifier', GREEN_L
                st_color = GREEN
            elif pct >= 30:
                status, action, row_color = '⚠ Partiel', 'Compléter les données', AMBER_L
                st_color = AMBER
            else:
                status, action, row_color = '✗ Lacune', 'Collecte de données urgente', 'FEE2E2'
                st_color = RED

            bg = _fill(row_color)
            ws_gap.cell(row=row_num, column=1, value=sec['code']).fill = bg
            ws_gap.cell(row=row_num, column=1).font = _font(bold=True)
            ws_gap.cell(row=row_num, column=1).border = _border()
            ws_gap.cell(row=row_num, column=2, value=sec['label']).fill = bg
            ws_gap.cell(row=row_num, column=2).border = _border()
            ws_gap.cell(row=row_num, column=3, value=count).fill = bg
            ws_gap.cell(row=row_num, column=3).alignment = Alignment(horizontal='center')
            ws_gap.cell(row=row_num, column=3).border = _border()
            ws_gap.cell(row=row_num, column=4, value=f'{pct}%').fill = bg
            ws_gap.cell(row=row_num, column=4).alignment = Alignment(horizontal='center')
            ws_gap.cell(row=row_num, column=4).font = Font(bold=True, color=st_color, size=10, name='Calibri')
            ws_gap.cell(row=row_num, column=4).border = _border()
            ws_gap.cell(row=row_num, column=5, value=status).fill = bg
            ws_gap.cell(row=row_num, column=5).font = Font(bold=True, color=st_color, size=10, name='Calibri')
            ws_gap.cell(row=row_num, column=5).alignment = Alignment(horizontal='center')
            ws_gap.cell(row=row_num, column=5).border = _border()
            ws_gap.cell(row=row_num, column=6, value=action).fill = bg
            ws_gap.cell(row=row_num, column=6).border = _border()
            ws_gap.row_dimensions[row_num].height = 20

        # ══════════════════════════════════════════
        # Sheet 4 — Par pilier
        # ══════════════════════════════════════════
        for pillar_key, pillar_label, pcolor, plcolor in [
            ('environmental', 'Environnement', GREEN, GREEN_L),
            ('social',        'Social',        BLUE,  BLUE_L),
            ('governance',    'Gouvernance',   PURPLE, PURPLE_L),
        ]:
            ws_p = wb.create_sheet(pillar_label[:15])
            ws_p.sheet_view.showGridLines = False
            ws_p.freeze_panes = 'A2'
            ws_p.column_dimensions['A'].width = 35
            ws_p.column_dimensions['B'].width = 18
            ws_p.column_dimensions['C'].width = 12
            ws_p.column_dimensions['D'].width = 15

            _header_row(ws_p, 1, ['Métrique', 'Valeur', 'Unité', 'Statut'], pcolor)
            ws_p.row_dimensions[1].height = 22

            pillar_entries = entries.get(pillar_key, [])
            for j, entry in enumerate(pillar_entries):
                rn = j + 2
                bg = _fill(plcolor if j % 2 == 0 else WHITE)
                ws_p.cell(row=rn, column=1, value=str(entry.get('metric_name', ''))[:60]).fill = bg
                ws_p.cell(row=rn, column=1).border = _border()
                ws_p.cell(row=rn, column=2, value=str(entry.get('value', '—'))).fill = bg
                ws_p.cell(row=rn, column=2).alignment = Alignment(horizontal='center')
                ws_p.cell(row=rn, column=2).border = _border()
                ws_p.cell(row=rn, column=3, value=str(entry.get('unit', ''))).fill = bg
                ws_p.cell(row=rn, column=3).alignment = Alignment(horizontal='center')
                ws_p.cell(row=rn, column=3).border = _border()
                status = entry.get('verification_status', 'pending')
                status_label = {'verified': '✓', 'pending': '⏳', 'rejected': '✗'}.get(status, '?')
                s_color = GREEN if status == 'verified' else (AMBER if status == 'pending' else RED)
                ws_p.cell(row=rn, column=4, value=status_label).fill = bg
                ws_p.cell(row=rn, column=4).font = Font(color=s_color, size=11, name='Calibri')
                ws_p.cell(row=rn, column=4).alignment = Alignment(horizontal='center')
                ws_p.cell(row=rn, column=4).border = _border()
                ws_p.row_dimensions[rn].height = 18

            if not pillar_entries:
                ws_p.cell(row=2, column=1, value='Aucune donnée pour ce pilier').font = Font(italic=True, color=GRAY, name='Calibri')

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return buf.read()

    # ─── Word Export ──────────────────────────────────────────────────────────

    def _generate_word(self, report_type: str, data: Dict[str, Any], year: int) -> bytes:
        """Generate a structured Word (.docx) CSRD report."""
        try:
            from docx import Document
            from docx.shared import Pt, RGBColor, Cm, Inches
            from docx.enum.text import WD_ALIGN_PARAGRAPH
            from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
            from docx.oxml.ns import qn
            from docx.oxml import OxmlElement
        except ImportError:
            raise ValueError("python-docx library not installed. Please add python-docx to requirements.txt.")

        stats = data['stats']
        org_name = data.get('org_name', 'Organisation')
        by_section = data.get('by_section', {})
        entries = data.get('entries', {})

        doc = Document()

        # Page setup: A4
        section = doc.sections[0]
        section.page_width = Cm(21)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2)

        # ── Cover Page ──
        doc.add_heading('RAPPORT CSRD', level=0)
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(org_name)
        run.bold = True
        run.font.size = Pt(18)

        p2 = doc.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.add_run(f'Exercice {year} · Conforme ESRS 2024').font.size = Pt(12)

        doc.add_paragraph(f'Score ESG Global : {stats["score"]}/100')
        doc.add_paragraph(f'Notation : {stats["rating"]}')
        doc.add_paragraph(f'Indicateurs collectés : {stats["total_entries"]} (vérifiés : {stats["verified_count"]})')
        doc.add_paragraph(f'Généré le : {datetime.now().strftime("%d/%m/%Y à %H:%M")} — ESGFlow')

        doc.add_page_break()

        # ── Executive Summary ──
        doc.add_heading('1. Résumé Exécutif', level=1)
        summary_data = [
            ['Indicateur', 'Valeur'],
            ['Score ESG Global', f'{stats["score"]}/100'],
            ['Indicateurs totaux', str(stats['total_entries'])],
            ['Indicateurs vérifiés', str(stats['verified_count'])],
            ['En attente de vérification', str(stats['pending_count'])],
            ['Indicateurs Environnement', str(stats['by_pillar']['environmental'])],
            ['Indicateurs Social', str(stats['by_pillar']['social'])],
            ['Indicateurs Gouvernance', str(stats['by_pillar']['governance'])],
        ]
        t = doc.add_table(rows=len(summary_data), cols=2)
        t.style = 'Table Grid'
        for i, row_data in enumerate(summary_data):
            for j, cell_val in enumerate(row_data):
                cell = t.cell(i, j)
                cell.text = cell_val
                if i == 0:
                    cell.paragraphs[0].runs[0].bold = True

        doc.add_page_break()

        # ── ESRS Sections ──
        doc.add_heading('2. Données ESRS par Standard', level=1)

        for sec in ESRS_SECTIONS:
            sec_entries = by_section.get(sec['code'], [])
            count = len(sec_entries)
            pct = min(round(count / 5 * 100), 100) if count else 0

            doc.add_heading(f'{sec["code"]} — {sec["label"]} ({pct}% couvert)', level=2)

            if not sec_entries:
                p = doc.add_paragraph('⚠ Aucune donnée collectée pour cette section.')
                p.runs[0].italic = True
                continue

            headers = ['Métrique', 'Valeur', 'Unité', 'Statut']
            t = doc.add_table(rows=1 + len(sec_entries[:20]), cols=len(headers))
            t.style = 'Table Grid'

            hdr_row = t.rows[0]
            for j, h in enumerate(headers):
                hdr_row.cells[j].text = h
                hdr_row.cells[j].paragraphs[0].runs[0].bold = True

            for i, entry in enumerate(sec_entries[:20]):
                row = t.rows[i + 1]
                row.cells[0].text = str(entry.get('metric_name', ''))[:60]
                row.cells[1].text = str(entry.get('value', '—'))
                row.cells[2].text = str(entry.get('unit', ''))
                status = entry.get('verification_status', 'pending')
                row.cells[3].text = {'verified': '✓ Vérifié', 'pending': '⏳ En attente', 'rejected': '✗ Rejeté'}.get(status, status)

        doc.add_page_break()

        # ── Gap Analysis ──
        doc.add_heading('3. Analyse des Écarts (Gap Analysis)', level=1)
        gap_headers = ['Code', 'Section', 'Indicateurs', 'Couverture', 'Statut', 'Action']
        gt = doc.add_table(rows=1 + len(ESRS_SECTIONS), cols=len(gap_headers))
        gt.style = 'Table Grid'

        hdr_row = gt.rows[0]
        for j, h in enumerate(gap_headers):
            hdr_row.cells[j].text = h
            hdr_row.cells[j].paragraphs[0].runs[0].bold = True

        for i, sec in enumerate(ESRS_SECTIONS):
            count = len(by_section.get(sec['code'], []))
            pct = min(round(count / 5 * 100), 100) if count else 0
            row = gt.rows[i + 1]
            row.cells[0].text = sec['code']
            row.cells[1].text = sec['label']
            row.cells[2].text = str(count)
            row.cells[3].text = f'{pct}%'
            if pct >= 80:
                row.cells[4].text = '✓ Prêt'
                row.cells[5].text = 'Maintenir & vérifier'
            elif pct >= 30:
                row.cells[4].text = '⚠ Partiel'
                row.cells[5].text = 'Compléter les données'
            else:
                row.cells[4].text = '✗ Lacune'
                row.cells[5].text = 'Collecte urgente'

        doc.add_page_break()

        # ── Footer info ──
        doc.add_heading('4. Cadres de Référence', level=1)
        frameworks = [
            'CSRD — Corporate Sustainability Reporting Directive (UE) 2022/2464',
            'ESRS — European Sustainability Reporting Standards 2024',
            'GRI — Global Reporting Initiative Standards 2021',
            'TCFD — Task Force on Climate-related Financial Disclosures',
            'SFDR — Sustainable Finance Disclosure Regulation',
            'Taxonomie UE — Règlement (UE) 2020/852',
        ]
        for fw in frameworks:
            doc.add_paragraph(fw, style='List Bullet')

        p = doc.add_paragraph()
        p.add_run(f'\n© {year} ESGFlow · Rapport généré automatiquement · {datetime.now().strftime("%d/%m/%Y")}').italic = True

        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()

    # Mapping pillar+keywords → ESRS section code
    _ESRS_KEYWORD_MAP = [
        ('E1', ['environmental'], ['scope 1','scope 2','scope 3','co2','carbone','ges','ghg','émission','énergie','renouvelable','climatique','température']),
        ('E2', ['environmental'], ['pollution','polluant','rejet','atmosphérique','contamination','sol']),
        ('E3', ['environmental'], ['eau','hydrique','water','aqua','marine','ressource']),
        ('E4', ['environmental'], ['biodiversité','écosystème','site protégé','faune','flore']),
        ('E5', ['environmental'], ['déchet','recyclage','circulaire','réemploi','emballage']),
        ('S1', ['social'],        ['effectif','salarié','employé','etp','contrat','cdi','cdd','formation','accident','turnover','femme','parité','diversité','rémunération']),
        ('S2', ['social'],        ['fournisseur','chaîne','supply','sous-traitant','prestataire']),
        ('S3', ['social'],        ['communauté','local','territoire','riverain','mécénat']),
        ('S4', ['social'],        ['consommateur','client','satisfaction','réclamation']),
        ('G1', ['governance'],    []),  # all governance goes to G1
    ]

    def _map_to_esrs(self, pillar: str, metric_name: str, category: str) -> str:
        """Map a data entry to an ESRS section code using keyword matching."""
        text = (metric_name + ' ' + (category or '')).lower()
        for code, pillars, keywords in self._ESRS_KEYWORD_MAP:
            if pillar not in pillars:
                continue
            if not keywords:  # catch-all for the pillar
                return code
            if any(kw in text for kw in keywords):
                return code
        # Fallback by pillar
        fallback = {'environmental': 'E1', 'social': 'S1', 'governance': 'G1'}
        return fallback.get(pillar, 'E1')

    async def _collect_data(
        self,
        tenant_id: UUID,
        organization_id: Optional[UUID],
        year: Optional[int]
    ) -> Dict[str, Any]:
        # ── Fetch data entries (no year filter to include all available data) ──
        query = select(DataEntry).where(DataEntry.tenant_id == tenant_id)
        if organization_id:
            query = query.where(DataEntry.organization_id == organization_id)
        if year:
            # Include entries from target year AND previous year for completeness
            query = query.where(extract('year', DataEntry.period_start).in_([year, year - 1]))

        result = await self.db.execute(query)
        entries = result.scalars().all()

        # ── Fetch real ESG score from esg_scores table ──
        real_score = 0
        real_rating = 'N/A'
        org_name = 'Organisation'
        try:
            score_q = select(ESGScore).where(ESGScore.tenant_id == tenant_id)
            if organization_id:
                score_q = score_q.where(ESGScore.organization_id == organization_id)
            score_q = score_q.order_by(ESGScore.created_at.desc()).limit(1)
            score_res = await self.db.execute(score_q)
            esg_score = score_res.scalar_one_or_none()
            if esg_score:
                real_score = round(esg_score.overall_score or 0)
                real_rating = esg_score.rating or 'N/A'

            # Get org name: by ID if provided, else first org in tenant
            if organization_id:
                org_q = select(Organization).where(Organization.id == organization_id)
            else:
                org_q = select(Organization).where(Organization.tenant_id == tenant_id).limit(1)
            org_res = await self.db.execute(org_q)
            org = org_res.scalar_one_or_none()
            if org:
                org_name = org.name
        except Exception:
            pass

        data_by_pillar: Dict[str, list] = {
            'environmental': [], 'social': [], 'governance': [],
        }
        by_section: Dict[str, list] = {s['code']: [] for s in ESRS_SECTIONS}

        for entry in entries:
            pillar = getattr(entry, 'pillar', None) or ''
            if pillar not in data_by_pillar:
                continue
            has_value = entry.value_numeric is not None or (entry.value_text and entry.value_text.strip())
            item = {
                'metric_name': entry.metric_name or '—',
                'value': entry.value_numeric if entry.value_numeric is not None else (entry.value_text or '—'),
                'unit': entry.unit or '',
                'category': entry.category or '',
                'verification_status': entry.verification_status or 'pending',
                'has_value': has_value,
            }
            data_by_pillar[pillar].append(item)
            # Map to ESRS section using keyword matching
            section_code = self._map_to_esrs(pillar, entry.metric_name or '', entry.category or '')
            if section_code in by_section:
                by_section[section_code].append(item)

        total = len(entries)
        with_data = sum(1 for e in entries if e.value_numeric is not None)
        pending = total - with_data

        return {
            'entries': data_by_pillar,
            'by_section': by_section,
            'org_name': org_name,
            'stats': {
                'total_entries': total,
                'verified_count': with_data,
                'pending_count': pending,
                'score': real_score,
                'rating': real_rating,
                'by_pillar': {
                    'environmental': len(data_by_pillar['environmental']),
                    'social': len(data_by_pillar['social']),
                    'governance': len(data_by_pillar['governance']),
                },
            },
            'total_count': total,
        }

    # ─── PDF Generation ───────────────────────────────────────────────────────

    async def _generate_pdf(self, report_type: str, data: Dict[str, Any], year: int) -> bytes:
        buffer = io.BytesIO()
        report_name = self.REPORT_TYPES[report_type]['name']
        stats = data['stats']

        # Dispatch CSRD to dedicated generator
        if report_type == 'csrd':
            return await self._generate_csrd_pdf(data, year)

        story = []

        # Cover page
        story += self._make_cover(report_name, year, stats, data.get('org_name', 'Organisation'))
        story.append(PageBreak())

        # Executive summary
        story += self._make_executive_summary(stats)
        story.append(PageBreak())

        # ESRS completeness
        story += self._make_esrs_completeness(data['by_section'])
        story.append(PageBreak())

        # Pillar data tables
        story += self._make_pillar_data(data['entries'])

        # Compliance page
        story.append(PageBreak())
        story += self._make_compliance_page(year)

        first_page_cb, later_pages_cb = _make_header_footer(report_name, year)

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=22*mm,
            bottomMargin=22*mm,
        )

        doc.build(story, onFirstPage=first_page_cb, onLaterPages=later_pages_cb)

        buffer.seek(0)
        return buffer.read()

    # ─── CSRD Dedicated Generator ─────────────────────────────────────────────

    async def _generate_csrd_pdf(self, data: Dict[str, Any], year: int) -> bytes:
        """Generate a structured CSRD compliance report with ESRS sections."""
        buffer = io.BytesIO()
        stats = data['stats']
        org_name = data.get('org_name', 'Organisation')
        by_section = data.get('by_section', {})

        story = []

        # 1. Cover page (reuse existing)
        story += self._make_cover('Rapport CSRD', year, stats, org_name)
        story.append(PageBreak())

        # 2. Table of contents
        story += self._make_csrd_toc()
        story.append(PageBreak())

        # 3. Executive Summary
        story += self._make_executive_summary(stats)
        story.append(PageBreak())

        # 4. ESRS sections one by one (E, S, G)
        story += self._make_csrd_esrs_sections(by_section, data['entries'])
        story.append(PageBreak())

        # 5. Gap analysis table
        story += self._make_csrd_gap_table(by_section)
        story.append(PageBreak())

        # 6. Compliance page
        story += self._make_compliance_page(year)

        first_page_cb, later_pages_cb = _make_header_footer('Rapport CSRD', year)

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=22*mm,
            bottomMargin=22*mm,
        )
        doc.build(story, onFirstPage=first_page_cb, onLaterPages=later_pages_cb)
        buffer.seek(0)
        return buffer.read()

    def _make_csrd_toc(self) -> list:
        """Table of contents page."""
        story = []
        story += self._section_header('Sommaire', C_NAVY)

        toc_items = [
            ('1.', 'Résumé exécutif',                      '3'),
            ('2.', 'Pilier Environnemental (ESRS E1–E5)',   '4'),
            ('3.', 'Pilier Social (ESRS S1–S4)',            '6'),
            ('4.', 'Pilier Gouvernance (ESRS G1)',          '8'),
            ('5.', 'Analyse des écarts (Gap Analysis)',     '9'),
            ('6.', 'Cadres de référence & Conformité',      '10'),
        ]

        rows = []
        for num, title, page in toc_items:
            rows.append([
                Paragraph(f'<b>{num}</b>', ParagraphStyle('tn', fontSize=10, textColor=C_GREEN)),
                Paragraph(title, ParagraphStyle('tt', fontSize=10, textColor=C_NAVY)),
                Paragraph(page, ParagraphStyle('tp', fontSize=10, textColor=C_GRAY, alignment=2)),
            ])

        t = Table(rows, colWidths=[10*mm, 140*mm, 20*mm])
        t.setStyle(TableStyle([
            ('ROWBACKGROUNDS', (0,0), (-1,-1), [C_WHITE, C_LGRAY]),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (0,-1), 8),
            ('LINEBELOW', (0,-1), (-1,-1), 1.5, C_GREEN),
        ]))
        story.append(t)
        return story

    def _make_csrd_esrs_sections(self, by_section: dict, entries: dict) -> list:
        """Generate one section per ESRS standard with data table."""
        story = []

        pillar_groups = [
            ('environmental', 'Pilier Environnemental', C_GREEN, C_GREEN2, [s for s in ESRS_SECTIONS if s['pillar'] == 'environmental']),
            ('social',        'Pilier Social',          C_BLUE,  C_BLUE2,  [s for s in ESRS_SECTIONS if s['pillar'] == 'social']),
            ('governance',    'Pilier Gouvernance',     C_PURPLE, C_PURPLE2, [s for s in ESRS_SECTIONS if s['pillar'] == 'governance']),
        ]

        for pillar_key, pillar_label, p_color, p_bg, sections in pillar_groups:
            story += self._section_header(pillar_label, p_color, size=14)

            pillar_entries = entries.get(pillar_key, [])
            pillar_total = len(pillar_entries)

            story.append(Paragraph(
                f'{pillar_total} indicateur(s) collecté(s) pour ce pilier.',
                ParagraphStyle('intro', fontSize=9, textColor=C_GRAY, spaceAfter=6)
            ))

            for sec in sections:
                sec_entries = by_section.get(sec['code'], [])
                count = len(sec_entries)
                pct = min(round(count / 5 * 100), 100) if count else 0

                # Section sub-header
                sec_header = Table(
                    [[
                        Paragraph(f'<font color="white"><b>{sec["code"]}</b></font>',
                                   ParagraphStyle('sh', fontSize=9, alignment=1)),
                        Paragraph(f'<font color="white"><b>{sec["label"]}</b></font>',
                                   ParagraphStyle('sl', fontSize=9)),
                        Paragraph(f'<font color="white">{pct}% couvert</font>',
                                   ParagraphStyle('sp', fontSize=8, alignment=2)),
                    ]],
                    colWidths=[16*mm, 120*mm, 34*mm],
                )
                sec_header.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), p_color),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('TOPPADDING', (0,0), (-1,-1), 5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                    ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ('RIGHTPADDING', (0,0), (-1,-1), 8),
                ]))
                story.append(sec_header)

                if sec_entries:
                    # Data table for this section
                    rows = [['Métrique', 'Valeur', 'Unité', 'Statut']]
                    for entry in sec_entries[:15]:
                        status_text = '✓' if entry.get('verification_status') == 'verified' else '⏳'
                        rows.append([
                            str(entry.get('metric_name', ''))[:55],
                            str(entry.get('value', '—'))[:20],
                            str(entry.get('unit', ''))[:12],
                            status_text,
                        ])

                    dt = Table(rows, colWidths=[88*mm, 32*mm, 24*mm, 26*mm])
                    dt.setStyle(TableStyle([
                        ('BACKGROUND',    (0,0), (-1,0), p_bg),
                        ('TEXTCOLOR',     (0,0), (-1,0), p_color),
                        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
                        ('FONTSIZE',      (0,0), (-1,0), 8),
                        ('FONTSIZE',      (0,1), (-1,-1), 7.5),
                        ('ROWBACKGROUNDS',(0,1), (-1,-1), [C_WHITE, C_LGRAY]),
                        ('GRID',          (0,0), (-1,-1), 0.2, C_MGRAY),
                        ('ALIGN',         (1,0), (-1,-1), 'CENTER'),
                        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
                        ('TOPPADDING',    (0,0), (-1,-1), 4),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                        ('LEFTPADDING',   (0,0), (0,-1), 8),
                    ]))
                    story.append(dt)
                else:
                    # No data message
                    no_data = Table(
                        [[Paragraph('⚠ Aucune donnée collectée pour cette section.',
                                     ParagraphStyle('nd', fontSize=8, textColor=C_AMBER))]],
                        colWidths=[170*mm],
                    )
                    no_data.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,-1), C_AMBER2),
                        ('TOPPADDING', (0,0), (-1,-1), 6),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                        ('LEFTPADDING', (0,0), (-1,-1), 10),
                    ]))
                    story.append(no_data)

                story.append(Spacer(1, 3*mm))

            story.append(PageBreak())

        return story

    def _make_csrd_gap_table(self, by_section: dict) -> list:
        """Gap analysis table: ESRS standard | Coverage | Status | Recommended action."""
        story = []
        story += self._section_header('Analyse des écarts ESRS (Gap Analysis)', C_NAVY)
        story.append(Paragraph(
            'Récapitulatif de la couverture des exigences ESRS et actions recommandées.',
            ParagraphStyle('sub', fontSize=9, textColor=C_GRAY, spaceAfter=8)
        ))

        rows = [['Standard', 'Section', 'Données', 'Couverture', 'Statut', 'Action prioritaire']]

        for sec in ESRS_SECTIONS:
            count = len(by_section.get(sec['code'], []))
            pct = min(round(count / 5 * 100), 100) if count else 0

            if pct >= 80:
                status = '✓ Prêt'
                status_color = C_GREEN
                action = 'Maintenir & vérifier'
            elif pct >= 30:
                status = '⚠ Partiel'
                status_color = C_AMBER
                action = 'Compléter les données manquantes'
            else:
                status = '✗ Manquant'
                status_color = C_RED
                action = 'Collecte de données requise'

            # Color code the pillar
            if sec['pillar'] == 'environmental':
                code_color = C_GREEN
            elif sec['pillar'] == 'social':
                code_color = C_BLUE
            else:
                code_color = C_PURPLE

            rows.append([
                Paragraph(f'<font color="{_hex(code_color)}"><b>{sec["code"]}</b></font>',
                           ParagraphStyle('gc', fontSize=8)),
                Paragraph(sec['label'][:35],
                           ParagraphStyle('gl', fontSize=8, textColor=C_NAVY)),
                Paragraph(str(count),
                           ParagraphStyle('gd', fontSize=8, alignment=1)),
                self._progress_bar(pct, code_color, width=28*mm, height=4*mm),
                Paragraph(f'<font color="{_hex(status_color)}"><b>{status}</b></font>',
                           ParagraphStyle('gs', fontSize=7, alignment=1)),
                Paragraph(action,
                           ParagraphStyle('ga', fontSize=7, textColor=C_GRAY)),
            ])

        t = Table(rows, colWidths=[14*mm, 46*mm, 14*mm, 30*mm, 18*mm, 48*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), C_NAVY),
            ('TEXTCOLOR',     (0,0), (-1,0), C_WHITE),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0), 8),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [C_WHITE, C_LGRAY]),
            ('GRID',          (0,0), (-1,-1), 0.3, C_MGRAY),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
            ('ALIGN',         (2,0), (2,-1), 'CENTER'),
            ('ALIGN',         (4,0), (4,-1), 'CENTER'),
        ]))
        story.append(t)

        # Summary box
        story.append(Spacer(1, 6*mm))
        ready = sum(1 for s in ESRS_SECTIONS if min(round(len(by_section.get(s['code'], [])) / 5 * 100), 100) >= 80)
        partial = sum(1 for s in ESRS_SECTIONS if 30 <= min(round(len(by_section.get(s['code'], [])) / 5 * 100), 100) < 80)
        missing = len(ESRS_SECTIONS) - ready - partial

        summary = Table(
            [[
                self._kpi_cell(str(ready), 'Standards prêts', C_GREEN, C_GREEN2),
                self._kpi_cell(str(partial), 'Standards partiels', C_AMBER, C_AMBER2),
                self._kpi_cell(str(missing), 'Standards manquants', C_RED, colors.HexColor('#fee2e2')),
                self._kpi_cell(f'{round(ready/len(ESRS_SECTIONS)*100)}%', 'Conformité globale', C_BLUE, C_BLUE2),
            ]],
            colWidths=[40*mm, 40*mm, 40*mm, 40*mm],
        )
        summary.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(summary)

        return story

    # ─── Cover Page ───────────────────────────────────────────────────────────

    def _make_cover(self, report_name: str, year: int, stats: dict, org_name: str = 'Organisation') -> list:
        story = []
        styles = getSampleStyleSheet()

        # Navy header block (simulated with colored table)
        cover_header = Table(
            [[Paragraph(
                '<font color="white" size="32"><b>ESGFlow</b></font><br/>'
                '<font color="#d1fae5" size="11">Plateforme de reporting ESG</font>',
                ParagraphStyle('ch', alignment=1, leading=20)
            )]],
            colWidths=[170*mm],
        )
        cover_header.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), C_NAVY),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 28),
            ('BOTTOMPADDING', (0,0), (-1,-1), 28),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ]))
        story.append(cover_header)

        # Green accent bar
        accent = Table([['']], colWidths=[170*mm], rowHeights=[4])
        accent.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), C_GREEN),
        ]))
        story.append(accent)
        story.append(Spacer(1, 18*mm))

        # Organisation name
        story.append(Paragraph(
            org_name,
            ParagraphStyle('cover_org', fontSize=14, textColor=C_GREEN,
                           alignment=1, fontName='Helvetica-Bold', spaceAfter=4)
        ))

        # Report title
        story.append(Paragraph(
            report_name.upper(),
            ParagraphStyle('cover_title', fontSize=26, textColor=C_NAVY,
                           alignment=1, fontName='Helvetica-Bold', spaceAfter=6)
        ))
        story.append(Paragraph(
            f'Exercice {year}',
            ParagraphStyle('cover_year', fontSize=16, textColor=C_GRAY,
                           alignment=1, spaceAfter=6)
        ))
        story.append(HRFlowable(width='40%', thickness=2, color=C_GREEN,
                                 lineCap='round', spaceAfter=14))
        story.append(Paragraph(
            'Rapport de durabilité conforme aux exigences CSRD / ESRS',
            ParagraphStyle('cover_sub', fontSize=11, textColor=C_GRAY, alignment=1)
        ))
        story.append(Spacer(1, 12*mm))

        # KPI summary strip on cover
        score = stats.get('score', 0)
        rating = stats.get('rating', 'N/A')
        kpi_data = [
            [
                self._kpi_cell(str(stats.get('total_entries', 0)), 'Indicateurs', C_NAVY, C_LGRAY),
                self._kpi_cell(str(stats.get('verified_count', 0)), 'Vérifiés', C_GREEN, C_GREEN2),
                self._kpi_cell(f"{score}/100", 'Score global', C_BLUE, C_BLUE2),
                self._kpi_cell(rating, 'Note ESG', C_AMBER, C_AMBER2),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[40*mm, 40*mm, 40*mm, 40*mm])
        kpi_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10*mm))

        # Generation info
        story.append(Paragraph(
            f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} · ESGFlow v2.0.0",
            ParagraphStyle('cover_date', fontSize=9, textColor=C_GRAY, alignment=1)
        ))

        return story

    def _kpi_cell(self, value: str, label: str, text_color, bg_color) -> Table:
        t = Table(
            [[Paragraph(
                f'<font color="{_hex(text_color)}" size="20"><b>{value}</b></font><br/>'
                f'<font color="{_hex(C_GRAY)}" size="8">{label}</font>',
                ParagraphStyle('kpi', alignment=1, leading=16)
            )]],
            colWidths=[38*mm], rowHeights=[22*mm]
        )
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_color),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROUNDEDCORNERS', [6]),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    # ─── Executive Summary ────────────────────────────────────────────────────

    def _make_executive_summary(self, stats: dict) -> list:
        story = []
        story += self._section_header('Résumé Exécutif', C_NAVY)

        score = stats['score']

        # Two-column layout: gauge left, pillar bars right
        gauge = self._make_gauge(score)
        pillar_table = self._make_pillar_bars(stats['by_pillar'])

        layout = Table(
            [[gauge, pillar_table]],
            colWidths=[75*mm, 95*mm],
        )
        layout.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(layout)
        story.append(Spacer(1, 8*mm))

        # Stats summary table
        story += self._section_header('Données collectées', C_GREEN, size=13)
        rows = [
            ['Indicateur', 'Valeur', 'Statut'],
            ['Total indicateurs ESG',    str(stats['total_entries']),  ''],
            ['Données vérifiées',         str(stats['verified_count']), '✓'],
            ['Données en attente',        str(stats['pending_count']),  '⏳'],
            ['Taux de vérification',      f"{score}%",                  ''],
            ['Pilier Environnemental',    str(stats['by_pillar']['environmental']), ''],
            ['Pilier Social',             str(stats['by_pillar']['social']),        ''],
            ['Pilier Gouvernance',        str(stats['by_pillar']['governance']),    ''],
        ]
        t = Table(rows, colWidths=[90*mm, 40*mm, 40*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND',   (0,0), (-1,0), C_NAVY),
            ('TEXTCOLOR',    (0,0), (-1,0), C_WHITE),
            ('FONTNAME',     (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',     (0,0), (-1,0), 10),
            ('FONTSIZE',     (0,1), (-1,-1), 9),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_LGRAY]),
            ('GRID',         (0,0), (-1,-1), 0.3, C_MGRAY),
            ('ALIGN',        (1,0), (-1,-1), 'CENTER'),
            ('VALIGN',       (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',   (0,0), (-1,-1), 6),
            ('BOTTOMPADDING',(0,0), (-1,-1), 6),
            ('LEFTPADDING',  (0,0), (0,-1), 10),
        ]))
        story.append(t)
        return story

    def _make_gauge(self, score: int) -> Drawing:
        d = Drawing(70*mm, 80*mm)

        cx, cy, r = 35*mm, 45*mm, 28*mm

        # Background circle (gray)
        pie = Pie()
        pie.x = cx - r
        pie.y = cy - r
        pie.width  = 2 * r
        pie.height = 2 * r
        pie.data = [score, 100 - score]
        pie.startAngle = 90
        pie.direction = 'clockwise'
        pie.slices[0].fillColor = C_GREEN if score >= 70 else (C_AMBER if score >= 40 else C_RED)
        pie.slices[0].strokeColor = colors.white
        pie.slices[0].strokeWidth = 2
        pie.slices[1].fillColor = C_MGRAY
        pie.slices[1].strokeColor = colors.white
        pie.slices[1].strokeWidth = 2
        pie.innerRadiusFraction = 0.65
        d.add(pie)

        # Center text
        d.add(String(cx, cy + 5, f'{score}%',
                     fontSize=18, fontName='Helvetica-Bold',
                     fillColor=C_NAVY, textAnchor='middle'))
        d.add(String(cx, cy - 10, 'Score global',
                     fontSize=7, fontName='Helvetica',
                     fillColor=C_GRAY, textAnchor='middle'))

        # Label below
        d.add(String(cx, 8*mm, 'Complétude ESRS',
                     fontSize=8, fontName='Helvetica',
                     fillColor=C_GRAY, textAnchor='middle'))
        return d

    def _make_pillar_bars(self, by_pillar: dict) -> Table:
        env_count = by_pillar['environmental']
        soc_count = by_pillar['social']
        gov_count = by_pillar['governance']
        total = max(env_count + soc_count + gov_count, 1)

        rows = [
            [Paragraph('<b>Répartition par pilier</b>',
                       ParagraphStyle('ph', fontSize=10, textColor=C_NAVY))],
        ]

        for label, count, color in [
            ('Environnemental', env_count, C_GREEN),
            ('Social',          soc_count, C_BLUE),
            ('Gouvernance',     gov_count, C_PURPLE),
        ]:
            pct = round(count / total * 100)
            bar = self._progress_bar(pct, color, width=85*mm)
            sub = Table(
                [[Paragraph(label, ParagraphStyle('bl', fontSize=9, textColor=C_NAVY)),
                  Paragraph(f'<font color="{_hex(color)}"><b>{count}</b></font>',
                            ParagraphStyle('bv', fontSize=9, alignment=2))]],
                colWidths=[65*mm, 20*mm],
            )
            sub.setStyle(TableStyle([
                ('TOPPADDING', (0,0),(-1,-1), 2),
                ('BOTTOMPADDING', (0,0),(-1,-1), 2),
                ('LEFTPADDING', (0,0),(-1,-1), 0),
                ('RIGHTPADDING', (0,0),(-1,-1), 0),
            ]))
            rows.append([sub])
            rows.append([bar])
            rows.append([Spacer(1, 3*mm)])

        t = Table(rows, colWidths=[90*mm])
        t.setStyle(TableStyle([
            ('LEFTPADDING', (0,0),(-1,-1), 6),
            ('RIGHTPADDING', (0,0),(-1,-1), 0),
            ('TOPPADDING', (0,0),(-1,-1), 2),
            ('BOTTOMPADDING', (0,0),(-1,-1), 2),
        ]))
        return t

    # ─── ESRS Completeness ────────────────────────────────────────────────────

    def _make_esrs_completeness(self, by_section: dict) -> list:
        story = []
        story += self._section_header('Complétude par section ESRS', C_NAVY)
        story.append(Paragraph(
            'Taux de remplissage des indicateurs par section ESRS obligatoire.',
            ParagraphStyle('sub', fontSize=9, textColor=C_GRAY, spaceAfter=8)
        ))

        pillar_groups = {
            'environmental': ('Pilier Environnemental (E1–E5)', C_GREEN, C_GREEN2),
            'social':        ('Pilier Social (S1–S4)',          C_BLUE,  C_BLUE2),
            'governance':    ('Pilier Gouvernance (G1)',        C_PURPLE, C_PURPLE2),
        }

        for pillar_key, (pillar_label, p_color, p_bg) in pillar_groups.items():
            sections = [s for s in ESRS_SECTIONS if s['pillar'] == pillar_key]

            # Pillar header
            ph = Table(
                [[Paragraph(f'<font color="white"><b>{pillar_label}</b></font>',
                            ParagraphStyle('ph', fontSize=10))]],
                colWidths=[170*mm],
            )
            ph.setStyle(TableStyle([
                ('BACKGROUND', (0,0),(-1,-1), p_color),
                ('TOPPADDING', (0,0),(-1,-1), 6),
                ('BOTTOMPADDING', (0,0),(-1,-1), 6),
                ('LEFTPADDING', (0,0),(-1,-1), 10),
            ]))
            story.append(ph)

            rows = []
            for sec in sections:
                count = len(by_section.get(sec['code'], []))
                # Heuristic: 5 entries = 100%
                pct = min(round(count / 5 * 100), 100) if count > 0 else 0

                badge = Table(
                    [[Paragraph(
                        f'<font color="white"><b>{sec["code"]}</b></font>',
                        ParagraphStyle('badge', fontSize=8, alignment=1)
                    )]],
                    colWidths=[14*mm], rowHeights=[7*mm],
                )
                badge.setStyle(TableStyle([
                    ('BACKGROUND', (0,0),(-1,-1), p_color),
                    ('ALIGN', (0,0),(-1,-1), 'CENTER'),
                    ('VALIGN', (0,0),(-1,-1), 'MIDDLE'),
                    ('TOPPADDING', (0,0),(-1,-1), 1),
                    ('BOTTOMPADDING', (0,0),(-1,-1), 1),
                    ('ROUNDEDCORNERS', [4]),
                ]))

                bar = self._progress_bar(pct, p_color, width=80*mm, height=5*mm)

                pct_para = Paragraph(
                    f'<font color="{_hex(p_color)}"><b>{pct}%</b></font>',
                    ParagraphStyle('pct', fontSize=9, alignment=2)
                )
                label_para = Paragraph(
                    sec['label'],
                    ParagraphStyle('lbl', fontSize=8, textColor=C_NAVY)
                )
                count_para = Paragraph(
                    f'{count} indicateur(s)',
                    ParagraphStyle('cnt', fontSize=7, textColor=C_GRAY)
                )

                label_col = Table(
                    [[label_para], [count_para]],
                    colWidths=[55*mm],
                )
                label_col.setStyle(TableStyle([
                    ('TOPPADDING', (0,0),(-1,-1), 0),
                    ('BOTTOMPADDING', (0,0),(-1,-1), 1),
                    ('LEFTPADDING', (0,0),(-1,-1), 0),
                    ('RIGHTPADDING', (0,0),(-1,-1), 0),
                ]))

                bar_col = Table(
                    [[bar], [Spacer(1, 1)]],
                    colWidths=[80*mm],
                )
                bar_col.setStyle(TableStyle([
                    ('TOPPADDING', (0,0),(-1,-1), 2),
                    ('BOTTOMPADDING', (0,0),(-1,-1), 0),
                    ('LEFTPADDING', (0,0),(-1,-1), 0),
                    ('RIGHTPADDING', (0,0),(-1,-1), 0),
                ]))

                rows.append([badge, label_col, bar_col, pct_para])

            section_table = Table(
                rows,
                colWidths=[16*mm, 57*mm, 82*mm, 15*mm],
            )
            section_table.setStyle(TableStyle([
                ('ROWBACKGROUNDS', (0,0), (-1,-1), [C_WHITE, p_bg]),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 4),
                ('GRID', (0,0), (-1,-1), 0.2, C_MGRAY),
            ]))
            story.append(section_table)
            story.append(Spacer(1, 4*mm))

        return story

    # ─── Pillar Data Tables ───────────────────────────────────────────────────

    def _make_pillar_data(self, entries: dict) -> list:
        story = []
        pillars = [
            ('environmental', 'Données Environnementales', C_GREEN),
            ('social',        'Données Sociales',          C_BLUE),
            ('governance',    'Données de Gouvernance',    C_PURPLE),
        ]

        for key, label, color in pillars:
            data = entries.get(key, [])
            if not data:
                continue

            story += self._section_header(label, color)

            rows = [['Métrique', 'Valeur', 'Unité', 'Statut']]
            for entry in data[:40]:
                status = '✓ Vérifié' if entry['verification_status'] == 'verified' else '⏳ Attente'
                rows.append([
                    str(entry['metric_name'] or '')[:50],
                    str(entry['value'] or '-')[:22],
                    str(entry['unit']   or '-')[:12],
                    status,
                ])

            t = Table(rows, colWidths=[80*mm, 35*mm, 25*mm, 30*mm])
            t.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (-1,0), color),
                ('TEXTCOLOR',     (0,0), (-1,0), C_WHITE),
                ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE',      (0,0), (-1,0), 9),
                ('FONTSIZE',      (0,1), (-1,-1), 8),
                ('ROWBACKGROUNDS',(0,1), (-1,-1), [C_WHITE, C_LGRAY]),
                ('GRID',          (0,0), (-1,-1), 0.3, C_MGRAY),
                ('ALIGN',         (1,0), (-1,-1), 'CENTER'),
                ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING',    (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('LEFTPADDING',   (0,0), (0,-1), 8),
            ]))
            story.append(t)
            story.append(Paragraph(
                f'Total: {len(data)} indicateur(s)',
                ParagraphStyle('total', fontSize=8, textColor=C_GRAY, spaceAfter=4)
            ))
            story.append(PageBreak())

        return story

    # ─── Compliance Page ──────────────────────────────────────────────────────

    def _make_compliance_page(self, year: int) -> list:
        story = []
        story += self._section_header('Conformité & Cadres de référence', C_NAVY)
        story.append(Paragraph(
            'Ce rapport est conforme aux standards internationaux de reporting ESG en vigueur.',
            ParagraphStyle('sub', fontSize=9, textColor=C_GRAY, spaceAfter=10)
        ))

        frameworks = [
            ('CSRD', 'Corporate Sustainability Reporting Directive', C_GREEN,
             'Directive européenne 2022/2464 — Obligatoire à partir de 2024'),
            ('ESRS', 'European Sustainability Reporting Standards', C_GREEN,
             'Standards EFRAG — 12 normes thématiques couvrant E, S et G'),
            ('GRI', 'Global Reporting Initiative', C_BLUE,
             'GRI Standards 2021 — Référentiel mondial de durabilité'),
            ('TCFD', 'Task Force on Climate-related Financial Disclosures', C_BLUE,
             'Recommandations sur les risques et opportunités climatiques'),
            ('GHG Protocol', 'Greenhouse Gas Protocol', C_PURPLE,
             'Comptabilisation et reporting des émissions de GES (scopes 1, 2, 3)'),
            ('ISO 26000', 'Norme ISO de responsabilité sociétale', C_PURPLE,
             'Lignes directrices pour la responsabilité des organisations'),
        ]

        rows = []
        for acronym, name, color, desc in frameworks:
            badge = Table(
                [[Paragraph(
                    f'<font color="white"><b>{acronym}</b></font>',
                    ParagraphStyle('fb', fontSize=9, alignment=1)
                )]],
                colWidths=[22*mm], rowHeights=[9*mm],
            )
            badge.setStyle(TableStyle([
                ('BACKGROUND', (0,0),(-1,-1), color),
                ('ALIGN', (0,0),(-1,-1), 'CENTER'),
                ('VALIGN', (0,0),(-1,-1), 'MIDDLE'),
                ('ROUNDEDCORNERS', [4]),
            ]))
            rows.append([
                badge,
                Table(
                    [[Paragraph(f'<b>{name}</b>',
                                ParagraphStyle('fn', fontSize=9, textColor=C_NAVY))],
                     [Paragraph(desc,
                                ParagraphStyle('fd', fontSize=8, textColor=C_GRAY))]],
                    colWidths=[145*mm],
                )
            ])

        t = Table(rows, colWidths=[24*mm, 146*mm])
        t.setStyle(TableStyle([
            ('ROWBACKGROUNDS', (0,0), (-1,-1), [C_WHITE, C_LGRAY]),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.3, C_MGRAY),
        ]))
        story.append(t)
        story.append(Spacer(1, 10*mm))

        story.append(HRFlowable(width='100%', thickness=1, color=C_MGRAY))
        story.append(Spacer(1, 4*mm))
        story.append(Paragraph(
            f'© {year} ESGFlow · Tous droits réservés · Rapport généré automatiquement par la plateforme ESGFlow v2.0.0',
            ParagraphStyle('footer', fontSize=8, textColor=C_GRAY, alignment=1)
        ))
        return story

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _section_header(self, title: str, color, size: int = 15) -> list:
        return [
            Paragraph(
                title,
                ParagraphStyle('sh', fontSize=size, fontName='Helvetica-Bold',
                               textColor=color, spaceBefore=6, spaceAfter=4)
            ),
            HRFlowable(width='100%', thickness=1.5, color=color, spaceAfter=8),
        ]

    def _progress_bar(self, pct: int, color, width=90*mm, height=5*mm) -> Drawing:
        w = float(width)
        h = float(height)
        d = Drawing(w, h)
        # Background track
        d.add(Rect(0, 0, w, h, rx=2, ry=2,
                   fillColor=C_MGRAY, strokeColor=None))
        # Fill
        fill_w = max(w * pct / 100, 0.1)
        d.add(Rect(0, 0, fill_w, h, rx=2, ry=2,
                   fillColor=color, strokeColor=None))
        return d
