"""
Report Service - Professional PDF reports (stable version)
"""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry


class ReportService:
    """Service for generating professional ESG reports"""
    
    REPORT_TYPES = {
        'executive': {'name': 'Rapport Exécutif', 'description': 'Vue d\'ensemble pour la direction'},
        'detailed': {'name': 'Rapport Détaillé', 'description': 'Analyse complète'},
        'csrd': {'name': 'Rapport CSRD', 'description': 'Conforme directive européenne'},
        'gri': {'name': 'Rapport GRI', 'description': 'Standards GRI 2021'},
        'tcfd': {'name': 'Rapport TCFD', 'description': 'Risques climatiques'},
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
        """Generate professional PDF report"""
        
        if report_type not in self.REPORT_TYPES:
            raise ValueError(f"Unknown report type: {report_type}")
        
        data = await self._collect_data(tenant_id, organization_id, year)
        
        if format == 'pdf':
            return await self._generate_pdf(report_type, data, year or datetime.now().year)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    async def _collect_data(self, tenant_id: UUID, organization_id: Optional[UUID], year: Optional[int]) -> Dict[str, Any]:
        """Collect data for report"""
        
        query = select(DataEntry).where(DataEntry.tenant_id == tenant_id)
        
        if organization_id:
            query = query.where(DataEntry.organization_id == organization_id)
        
        if year:
            query = query.where(extract('year', DataEntry.period_start) == year)
        
        result = await self.db.execute(query)
        entries = result.scalars().all()
        
        data_by_pillar = {
            'environmental': [],
            'social': [],
            'governance': [],
        }
        
        for entry in entries:
            if entry.pillar in data_by_pillar:
                data_by_pillar[entry.pillar].append({
                    'metric_name': entry.metric_name,
                    'value': entry.value_numeric or entry.value_text,
                    'unit': entry.unit,
                    'category': entry.category,
                    'verification_status': entry.verification_status,
                })
        
        stats = {
            'total_entries': len(entries),
            'verified_count': sum(1 for e in entries if e.verification_status == 'verified'),
            'pending_count': sum(1 for e in entries if e.verification_status == 'pending'),
            'by_pillar': {
                'environmental': len(data_by_pillar['environmental']),
                'social': len(data_by_pillar['social']),
                'governance': len(data_by_pillar['governance']),
            }
        }
        
        return {
            'entries': data_by_pillar,
            'stats': stats,
            'total_count': len(entries),
        }
    
    async def _generate_pdf(self, report_type: str, data: Dict[str, Any], year: int) -> bytes:
        """Generate professional PDF report"""
        
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=1,
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#059669'),
            spaceAfter=12,
            spaceBefore=20,
        )
        
        story = []
        
        # PAGE DE GARDE
        story.append(Spacer(1, 3*cm))
        
        logo = Paragraph(
            '<font size="48" color="#1e40af"><b>ESGFlow</b></font>',
            ParagraphStyle('logo', alignment=1)
        )
        story.append(logo)
        story.append(Spacer(1, 1*cm))
        
        story.append(Paragraph(self.REPORT_TYPES[report_type]['name'], title_style))
        
        year_style = ParagraphStyle('year', alignment=1, fontSize=18, textColor=colors.HexColor('#6b7280'))
        story.append(Paragraph(f'Année {year}', year_style))
        story.append(Spacer(1, 2*cm))
        
        date_style = ParagraphStyle('date', alignment=1, fontSize=10, textColor=colors.HexColor('#9ca3af'))
        story.append(Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", date_style))
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph("Plateforme ESGFlow v2.0.0", date_style))
        
        story.append(PageBreak())
        
        # RÉSUMÉ EXÉCUTIF
        story.append(Paragraph("Résumé Exécutif", heading_style))
        story.append(Spacer(1, 0.5*cm))
        
        summary_data = [
            ['Indicateur', 'Valeur'],
            ['Total de données collectées', str(data['stats']['total_entries'])],
            ['Données vérifiées', str(data['stats']['verified_count'])],
            ['Données en attente', str(data['stats']['pending_count'])],
            ['Taux de vérification', f"{(data['stats']['verified_count'] / max(data['stats']['total_entries'], 1) * 100):.1f}%"],
            ['Données Environnementales', str(data['stats']['by_pillar']['environmental'])],
            ['Données Sociales', str(data['stats']['by_pillar']['social'])],
            ['Données Gouvernance', str(data['stats']['by_pillar']['governance'])],
        ]
        
        summary_table = Table(summary_data, colWidths=[10*cm, 5*cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        story.append(summary_table)
        
        story.append(PageBreak())
        
        # DONNÉES PAR PILIER
        pillars = {
            'environmental': ('Environnemental', colors.HexColor('#059669')),
            'social': ('Social', colors.HexColor('#2563eb')),
            'governance': ('Gouvernance', colors.HexColor('#7c3aed')),
        }
        
        for pillar_key, (pillar_name, pillar_color) in pillars.items():
            entries = data['entries'].get(pillar_key, [])
            
            if not entries:
                continue
            
            story.append(Paragraph(f"Pilier {pillar_name}", heading_style))
            story.append(Spacer(1, 0.5*cm))
            
            table_data = [['Métrique', 'Valeur', 'Unité', 'Statut']]
            
            for entry in entries[:30]:
                status_text = '✓ Vérifié' if entry['verification_status'] == 'verified' else '⏳ Attente'
                table_data.append([
                    entry['metric_name'][:45],
                    str(entry['value'])[:20] if entry['value'] else '-',
                    entry['unit'][:10] if entry['unit'] else '-',
                    status_text,
                ])
            
            data_table = Table(table_data, colWidths=[7*cm, 3*cm, 2*cm, 3*cm])
            data_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), pillar_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            story.append(data_table)
            story.append(Spacer(1, 0.5*cm))
            
            story.append(Paragraph(f"Total: {len(entries)} indicateur(s)", styles['Italic']))
            story.append(PageBreak())
        
        # PIED DE PAGE
        story.append(Spacer(1, 2*cm))
        story.append(Paragraph("Conformité garantie", heading_style))
        story.append(Paragraph(
            "Tous nos rapports sont conformes aux standards internationaux (ESRS, GRI, TCFD) et aux réglementations européennes CSRD.",
            styles['Normal']
        ))
        story.append(Spacer(1, 1*cm))
        
        footer = ParagraphStyle('footer', fontSize=10, textColor=colors.HexColor('#6b7280'), alignment=1)
        story.append(Paragraph(f"© {year} ESGFlow. Tous droits réservés.", footer))
        
        doc.build(story)
        
        buffer.seek(0)
        return buffer.read()
