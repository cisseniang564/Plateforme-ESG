import { format } from 'date-fns';

interface ReportData {
  organization: {
    id: string;
    name: string;
    industry?: string;
    external_id?: string;
  };
  scores: {
    overall: number;
    environmental: number;
    social: number;
    governance: number;
    rating: string;
    trend: number;
    data_completeness: number;
  };
  evolution: Array<{
    month: string;
    overall: number;
    environmental: number;
    social: number;
    governance: number;
  }>;
  period: {
    start: string;
    end: string;
  };
  type: string;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION PDF PROFESSIONNELLE
// ═══════════════════════════════════════════════════════════════

export const generatePDF = async (data: ReportData) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const { organization, scores, evolution, period, type } = data;
  
  let yPos = 20;
  
  // ─── PAGE DE GARDE ───
  doc.setFillColor(99, 102, 241); // Primary color
  doc.rect(0, 0, 210, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT ESG', 105, 25, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(type.toUpperCase(), 105, 35, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(organization.name, 105, 45, { align: 'center' });
  
  // Logo/Badge
  doc.setFillColor(16, 185, 129); // Green
  doc.circle(105, 70, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(scores.overall.toString(), 105, 75, { align: 'center' });
  
  // Rating
  doc.setFontSize(14);
  doc.text(scores.rating, 105, 92, { align: 'center' });
  
  yPos = 105;
  
  // ─── INFORMATIONS GÉNÉRALES ───
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const infos = [
    ['Généré le:', format(new Date(), 'dd/MM/yyyy à HH:mm')],
    ['Période:', `${format(new Date(period.start), 'dd/MM/yyyy')} - ${format(new Date(period.end), 'dd/MM/yyyy')}`],
    ['Secteur:', organization.industry || 'N/A'],
    ['ID Externe:', organization.external_id || 'N/A'],
    ['Complétude:', `${scores.data_completeness}%`]
  ];
  
  infos.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 65, yPos);
    yPos += 6;
  });
  
  yPos += 5;
  
  // ─── RÉSUMÉ EXÉCUTIF ───
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('RÉSUMÉ EXÉCUTIF', 20, yPos);
  yPos += 10;
  
  // Tableau des scores
  autoTable(doc, {
    startY: yPos,
    head: [['Pilier', 'Score', 'Performance', 'Tendance']],
    body: [
      [
        '🌿 Environnemental',
        scores.environmental.toString(),
        scores.environmental >= 70 ? 'Excellent' : scores.environmental >= 50 ? 'Bon' : 'À améliorer',
        scores.trend > 0 ? '↑' : '↓'
      ],
      [
        '👥 Social',
        scores.social.toString(),
        scores.social >= 70 ? 'Excellent' : scores.social >= 50 ? 'Bon' : 'À améliorer',
        scores.trend > 0 ? '↑' : '↓'
      ],
      [
        '⚖️ Gouvernance',
        scores.governance.toString(),
        scores.governance >= 70 ? 'Excellent' : scores.governance >= 50 ? 'Bon' : 'À améliorer',
        scores.trend > 0 ? '↑' : '↓'
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [99, 102, 241],
      fontSize: 11,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'center', cellWidth: 30 },
      2: { cellWidth: 40 },
      3: { halign: 'center', cellWidth: 30 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // ─── NOUVELLE PAGE - ÉVOLUTION ───
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('ÉVOLUTION SUR 12 MOIS', 20, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Mois', 'Global', 'E', 'S', 'G']],
    body: evolution.map(e => [
      e.month,
      e.overall.toString(),
      e.environmental.toString(),
      e.social.toString(),
      e.governance.toString()
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241],
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { halign: 'center', fontStyle: 'bold', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 25 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // ─── RECOMMANDATIONS ───
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('RECOMMANDATIONS', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const recommendations = [
    { priority: 'HAUTE', text: 'Améliorer la transparence des données carbone', impact: '+8 pts' },
    { priority: 'MOYENNE', text: 'Renforcer les programmes de diversité', impact: '+5 pts' },
    { priority: 'BASSE', text: 'Documenter les initiatives sociales', impact: '+3 pts' }
  ];
  
  recommendations.forEach(rec => {
    doc.setFillColor(rec.priority === 'HAUTE' ? 239 : rec.priority === 'MOYENNE' ? 59 : 16, 
                     rec.priority === 'HAUTE' ? 68 : rec.priority === 'MOYENNE' ? 130 : 185, 
                     rec.priority === 'HAUTE' ? 68 : rec.priority === 'MOYENNE' ? 246 : 129);
    doc.rect(20, yPos - 4, 3, 6, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text(rec.priority, 26, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(rec.text, 55, yPos);
    doc.setFont('helvetica', 'italic');
    doc.text(`Impact: ${rec.impact}`, 160, yPos);
    
    yPos += 8;
  });
  
  // ─── FOOTER ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} sur ${pageCount}`, 105, 285, { align: 'center' });
    doc.text('© ESGFlow Platform - Rapport confidentiel', 105, 290, { align: 'center' });
  }
  
  // Télécharger
  doc.save(`rapport-esg-${organization.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION EXCEL PROFESSIONNELLE
// ═══════════════════════════════════════════════════════════════

export const generateExcel = async (data: ReportData) => {
  const XLSX = await import('xlsx');
  const { organization, scores, evolution, period } = data;

  const wb = XLSX.utils.book_new();
  
  // ─── ONGLET 1: RÉSUMÉ ───
  const summaryData = [
    ['RAPPORT ESG - ' + organization.name.toUpperCase()],
    [],
    ['Généré le:', format(new Date(), 'dd/MM/yyyy à HH:mm')],
    ['Période:', `${format(new Date(period.start), 'dd/MM/yyyy')} - ${format(new Date(period.end), 'dd/MM/yyyy')}`],
    ['Secteur:', organization.industry || 'N/A'],
    ['ID Externe:', organization.external_id || 'N/A'],
    [],
    ['SCORE GLOBAL', scores.overall, scores.rating],
    ['Tendance', scores.trend != null ? (scores.trend > 0 ? `+${scores.trend.toFixed(1)}%` : `${scores.trend.toFixed(1)}%`) : '—'],
    ['Complétude des données', `${scores.data_completeness}%`],
    [],
    ['SCORES PAR PILIER'],
    ['Pilier', 'Score', 'Performance'],
    ['Environnemental', scores.environmental, scores.environmental >= 70 ? 'Excellent' : scores.environmental >= 50 ? 'Bon' : 'À améliorer'],
    ['Social', scores.social, scores.social >= 70 ? 'Excellent' : scores.social >= 50 ? 'Bon' : 'À améliorer'],
    ['Gouvernance', scores.governance, scores.governance >= 70 ? 'Excellent' : scores.governance >= 50 ? 'Bon' : 'À améliorer']
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Styles pour le résumé
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
  
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');
  
  // ─── ONGLET 2: ÉVOLUTION ───
  const evolutionData = [
    ['ÉVOLUTION DES SCORES SUR 12 MOIS'],
    [],
    ['Mois', 'Score Global', 'Environnemental', 'Social', 'Gouvernance'],
    ...evolution.map(e => [e.month, e.overall, e.environmental, e.social, e.governance])
  ];
  
  const wsEvolution = XLSX.utils.aoa_to_sheet(evolutionData);
  wsEvolution['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 15 }];
  
  XLSX.utils.book_append_sheet(wb, wsEvolution, 'Évolution');
  
  // ─── ONGLET 3: RECOMMANDATIONS ───
  const recoData = [
    ['RECOMMANDATIONS D\'AMÉLIORATION'],
    [],
    ['Priorité', 'Recommandation', 'Impact Potentiel', 'Pilier'],
    ['HAUTE', 'Améliorer la transparence des données carbone', '+8 points', 'Environnemental'],
    ['HAUTE', 'Mettre en place un plan de réduction CO2', '+7 points', 'Environnemental'],
    ['MOYENNE', 'Renforcer les programmes de diversité', '+5 points', 'Social'],
    ['MOYENNE', 'Augmenter les heures de formation', '+4 points', 'Social'],
    ['BASSE', 'Améliorer la documentation ESG', '+3 points', 'Gouvernance']
  ];
  
  const wsReco = XLSX.utils.aoa_to_sheet(recoData);
  wsReco['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 18 }, { wch: 18 }];
  
  XLSX.utils.book_append_sheet(wb, wsReco, 'Recommandations');
  
  // ─── ONGLET 4: DONNÉES BRUTES ───
  const rawData = [
    ['DONNÉES DÉTAILLÉES'],
    [],
    ['Organisation', organization.name],
    ['Secteur', organization.industry || 'N/A'],
    ['ID', organization.external_id || 'N/A'],
    [],
    ['Métrique', 'Valeur'],
    ['Score Global', scores.overall],
    ['Score Environnemental', scores.environmental],
    ['Score Social', scores.social],
    ['Score Gouvernance', scores.governance],
    ['Rating', scores.rating],
    ['Tendance (%)', scores.trend],
    ['Complétude des données (%)', scores.data_completeness]
  ];
  
  const wsRaw = XLSX.utils.aoa_to_sheet(rawData);
  wsRaw['!cols'] = [{ wch: 30 }, { wch: 20 }];
  
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Données Brutes');
  
  // Télécharger
  XLSX.writeFile(wb, `rapport-esg-${organization.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION WORD PROFESSIONNELLE
// ═══════════════════════════════════════════════════════════════

export const generateWord = async (data: ReportData) => {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } = await import('docx');
  const { organization, scores, evolution, period, type } = data;

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // ─── TITRE ───
        new Paragraph({
          text: 'RAPPORT ESG',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        
        new Paragraph({
          text: type.toUpperCase(),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          text: organization.name,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        
        // ─── SCORE PRINCIPAL ───
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: `Score ESG Global: ${scores.overall}`,
              bold: true,
              size: 32,
              color: '6366f1'
            })
          ]
        }),
        
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: `Rating: ${scores.rating}`,
              bold: true,
              size: 28
            })
          ]
        }),
        
        // ─── INFORMATIONS ───
        new Paragraph({
          text: 'Informations Générales',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'Généré le: ', bold: true }),
            new TextRun({ text: format(new Date(), 'dd/MM/yyyy à HH:mm') })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'Période: ', bold: true }),
            new TextRun({ text: `${format(new Date(period.start), 'dd/MM/yyyy')} - ${format(new Date(period.end), 'dd/MM/yyyy')}` })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'Secteur: ', bold: true }),
            new TextRun({ text: organization.industry || 'N/A' })
          ],
          spacing: { after: 100 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: 'Complétude des données: ', bold: true }),
            new TextRun({ text: `${scores.data_completeness}%` })
          ],
          spacing: { after: 400 }
        }),
        
        // ─── TABLEAU SCORES ───
        new Paragraph({
          text: 'Scores par Pilier',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 }
        }),
        
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Pilier', bold: true })
                      ]
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Score', bold: true })
                      ]
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Performance', bold: true })
                      ]
                    })
                  ]
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('🌿 Environnemental')] }),
                new TableCell({ children: [new Paragraph(scores.environmental.toString())] }),
                new TableCell({ children: [new Paragraph(scores.environmental >= 70 ? 'Excellent' : scores.environmental >= 50 ? 'Bon' : 'À améliorer')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('👥 Social')] }),
                new TableCell({ children: [new Paragraph(scores.social.toString())] }),
                new TableCell({ children: [new Paragraph(scores.social >= 70 ? 'Excellent' : scores.social >= 50 ? 'Bon' : 'À améliorer')] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('⚖️ Gouvernance')] }),
                new TableCell({ children: [new Paragraph(scores.governance.toString())] }),
                new TableCell({ children: [new Paragraph(scores.governance >= 70 ? 'Excellent' : scores.governance >= 50 ? 'Bon' : 'À améliorer')] })
              ]
            })
          ],
          width: { size: 100, type: WidthType.PERCENTAGE }
        }),
        
        // ─── RECOMMANDATIONS ───
        new Paragraph({
          text: 'Recommandations',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '🔴 PRIORITÉ HAUTE: ', bold: true, color: 'ef4444' }),
            new TextRun({ text: 'Améliorer la transparence des données carbone (Impact: +8 points)' })
          ],
          spacing: { after: 150 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '🟡 PRIORITÉ MOYENNE: ', bold: true, color: 'f59e0b' }),
            new TextRun({ text: 'Renforcer les programmes de diversité (Impact: +5 points)' })
          ],
          spacing: { after: 150 }
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: '🟢 PRIORITÉ BASSE: ', bold: true, color: '10b981' }),
            new TextRun({ text: 'Documenter les initiatives sociales (Impact: +3 points)' })
          ],
          spacing: { after: 400 }
        }),
        
        // ─── FOOTER ───
        new Paragraph({
          text: '─'.repeat(80),
          spacing: { before: 400, after: 200 }
        }),
        
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '© ESGFlow Platform - Rapport confidentiel',
              italics: true
            })
          ]
        })
      ]
    }]
  });
  
  // Télécharger
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-esg-${organization.name.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.docx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
