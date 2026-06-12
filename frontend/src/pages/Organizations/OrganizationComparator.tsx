import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Building2, Download, Share2, TrendingUp,
  Award, CheckCircle, Search, Plus, X, BarChart3, Activity,
  FileText, FileSpreadsheet, ChevronDown, Loader2
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import BackButton from '@/components/common/BackButton';
import api from '@/services/api';
import { getOrgLatestScore } from '@/services/esgScoringService';

interface Organization {
  id: string;
  name: string;
  external_id?: string;
  industry?: string;
  sector?: string;
}

interface OrgWithScores extends Organization {
  scores: {
    overall: number;
    environmental: number;
    social: number;
    governance: number;
    rating: string;
  };
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function scoreColor(s: number) {
  if (s >= 75) return 'text-green-600';
  if (s >= 60) return 'text-blue-600';
  if (s >= 45) return 'text-orange-500';
  return 'text-red-500';
}
function ratingCls(r: string) {
  if (r?.startsWith('A')) return 'bg-green-100 text-green-700 border-green-200';
  if (r?.startsWith('B')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (r === '—') return 'bg-gray-100 text-gray-400 border-gray-200';
  return 'bg-orange-100 text-orange-700 border-orange-200';
}

const EMPTY_SCORES = { overall: 0, environmental: 0, social: 0, governance: 0, rating: '—' };

export default function OrganizationComparator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<OrgWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportLoading, setExportLoading] = useState<'pdf' | 'word' | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Refs for chart capture
  const radarRef  = useRef<HTMLDivElement>(null);
  const barRef    = useRef<HTMLDivElement>(null);
  const tableRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { loadOrganizations(); }, []);

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    if (ids.length > 0 && allOrgs.length > 0) {
      const matching = allOrgs.filter(o => ids.includes(o.id)).slice(0, 5);
      Promise.all(matching.map(async org => {
        const s = await getOrgLatestScore(org.id);
        return { ...org, scores: s ? { overall: s.overall_score, environmental: s.environmental_score, social: s.social_score, governance: s.governance_score, rating: s.rating ?? '—' } : EMPTY_SCORES };
      })).then(setSelected);
    }
  }, [searchParams, allOrgs]);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/organizations');
      setAllOrgs(res.data?.organizations || res.data?.items || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const toggleOrg = async (org: Organization) => {
    const isSelected = selected.find(o => o.id === org.id);
    if (isSelected) {
      const next = selected.filter(o => o.id !== org.id);
      setSelected(next);
      updateUrl(next);
    } else {
      if (selected.length >= 5) return;
      setAdding(org.id);
      const s = await getOrgLatestScore(org.id);
      const orgWithScores: OrgWithScores = {
        ...org,
        scores: s ? { overall: s.overall_score, environmental: s.environmental_score, social: s.social_score, governance: s.governance_score, rating: s.rating ?? '—' } : EMPTY_SCORES,
      };
      const next = [...selected, orgWithScores];
      setSelected(next);
      updateUrl(next);
      setAdding(null);
    }
  };

  const updateUrl = (orgs: OrgWithScores[]) => {
    orgs.length > 0 ? setSearchParams({ ids: orgs.map(o => o.id).join(',') }) : setSearchParams({});
  };

  const filteredOrgs = useMemo(() =>
    allOrgs.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [allOrgs, searchQuery]);

  const radarData = useMemo(() => {
    if (!selected.length) return [];
    return [
      { subject: 'Global',        ...Object.fromEntries(selected.map(o => [o.name, o.scores.overall])) },
      { subject: 'Environnement', ...Object.fromEntries(selected.map(o => [o.name, o.scores.environmental])) },
      { subject: 'Social',        ...Object.fromEntries(selected.map(o => [o.name, o.scores.social])) },
      { subject: 'Gouvernance',   ...Object.fromEntries(selected.map(o => [o.name, o.scores.governance])) },
    ];
  }, [selected]);

  const barData = useMemo(() =>
    selected.map(org => ({
      name: org.name.length > 22 ? org.name.slice(0, 22) + '…' : org.name,
      E: org.scores.environmental,
      S: org.scores.social,
      G: org.scores.governance,
    })),
    [selected]);

  const insights = useMemo(() => {
    if (!selected.length) return null;
    const best    = selected.reduce((b, o) => o.scores.overall > b.scores.overall ? o : b);
    const worst   = selected.reduce((b, o) => o.scores.overall < b.scores.overall ? o : b);
    const avg     = Math.round(selected.reduce((s, o) => s + o.scores.overall, 0) / selected.length);
    const bestEnv = selected.reduce((b, o) => o.scores.environmental > b.scores.environmental ? o : b);
    return { best, worst, avg, bestEnv, gap: best.scores.overall - worst.scores.overall };
  }, [selected]);

  // ── Exports ────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    if (!selected.length) return;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const rows = [
      [`Comparaison ESG — Généré le ${dateStr} — ESG Flow`],
      [],
      ['Organisation', 'Score Global (/100)', 'Environnement (/100)', 'Social (/100)', 'Gouvernance (/100)', 'Rating ESG', 'Secteur'],
      ...selected.map(o => [
        o.name,
        o.scores.overall   || '—',
        o.scores.environmental || '—',
        o.scores.social        || '—',
        o.scores.governance    || '—',
        o.scores.rating,
        o.industry || o.sector || '—',
      ]),
      [],
      ['Insights'],
      insights ? ['Meilleur score global', insights.best.name, insights.best.scores.overall] : [],
      insights ? ['Score moyen',           '', insights.avg]                                  : [],
      insights ? ['Écart max (pts)',        '', Math.round(insights.gap)]                     : [],
      insights ? ['Leader Environnement',  insights.bestEnv.name, insights.bestEnv.scores.environmental] : [],
    ].filter(r => r.length > 0);

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '﻿'; // UTF-8 BOM for Excel French compatibility
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })),
      download: `comparaison-esg-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  };

  const exportPDF = async () => {
    if (!selected.length) return;
    setExportLoading('pdf');
    setExportMenuOpen(false);
    try {
      const { jsPDF }          = await import('jspdf');
      const autoTable          = (await import('jspdf-autotable')).default;
      const html2canvas        = (await import('html2canvas')).default;

      const pageW  = 297;   // A4 landscape mm
      const pageH  = 210;
      const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

      // ── Header band ────────────────────────────────────────────────────────
      doc.setFillColor(79, 70, 229);          // indigo-600
      doc.rect(0, 0, pageW, 22, 'F');

      doc.setFillColor(16, 185, 129);         // emerald accent bar
      doc.rect(0, 22, pageW, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('Comparaison ESG des Organisations', 12, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Généré le ${dateStr}  ·  ESG Flow`, pageW - 12, 14, { align: 'right' });

      // ── Orgs colour legend ─────────────────────────────────────────────────
      let cx = 12;
      selected.forEach((org, i) => {
        const rgb = parseInt(PALETTE[i].slice(1), 16);
        doc.setFillColor((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255);
        doc.circle(cx + 2, 18, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        const label = org.name.length > 22 ? org.name.slice(0, 22) + '…' : org.name;
        doc.text(label, cx + 6, 19);
        cx += doc.getTextWidth(label) + 14;
      });

      // ── Comparison table ───────────────────────────────────────────────────
      const colW = Math.min(45, Math.floor((pageW - 24 - 38) / selected.length));
      autoTable(doc, {
        startY: 30,
        tableWidth: pageW - 24,
        margin: { left: 12, right: 12 },
        head: [[
          { content: 'Indicateur', styles: { halign: 'left' } },
          ...selected.map((o, i) => ({
            content: o.name,   // full name — autotable wraps automatically
            styles: { halign: 'center' as const, textColor: [255, 255, 255] as [number,number,number], overflow: 'linebreak' as const, fillColor: (() => { const rgb = parseInt(PALETTE[i].slice(1), 16); return [(rgb >> 16)&255, (rgb >> 8)&255, rgb&255] as [number,number,number]; })() },
          })),
        ]],
        body: [
          ['Score ESG (/100)',    ...selected.map(o => String(o.scores.overall    || '—'))],
          ['Rating',             ...selected.map(o => o.scores.rating)],
          ['Environnement',      ...selected.map(o => String(o.scores.environmental || '—'))],
          ['Social',             ...selected.map(o => String(o.scores.social        || '—'))],
          ['Gouvernance',        ...selected.map(o => String(o.scores.governance    || '—'))],
          ['Secteur',            ...selected.map(o => o.industry || o.sector || '—')],
        ],
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 4,
        },
        bodyStyles: { fontSize: 9, cellPadding: 3.5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [55, 65, 81], cellWidth: 38 },
          ...Object.fromEntries(selected.map((_, i) => [i + 1, { halign: 'center', cellWidth: colW }])),
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        didDrawCell: (data: any) => {
          // Highlight best score in each row (except header & first col)
          if (data.section === 'body' && data.column.index > 0) {
            const rowIdx = data.row.index;
            const numericKeys = ['Score ESG (/100)', 'Environnement', 'Social', 'Gouvernance'];
            const rowLabel = ['Score ESG (/100)', 'Rating', 'Environnement', 'Social', 'Gouvernance', 'Secteur'][rowIdx];
            if (numericKeys.includes(rowLabel)) {
              const values = selected.map(o =>
                rowLabel === 'Score ESG (/100)'  ? o.scores.overall :
                rowLabel === 'Environnement'     ? o.scores.environmental :
                rowLabel === 'Social'            ? o.scores.social :
                                                   o.scores.governance
              );
              const max = Math.max(...values);
              const orgIdx = data.column.index - 1;
              if (values[orgIdx] === max && max > 0) {
                const { x, y, width, height } = data.cell;
                doc.setFillColor(220, 252, 231); // green-100
                doc.rect(x, y, width, height, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(22, 163, 74); // green-600
                doc.text(String(max), x + width / 2, y + height / 2 + 1, { align: 'center' });
              }
            }
          }
        },
      });

      // ── Charts (capture as images) ─────────────────────────────────────────
      const tableBottom = (doc as any).lastAutoTable?.finalY ?? 80;
      const chartY      = tableBottom + 6;
      const chartH      = pageH - chartY - 12;
      const chartW      = (pageW - 36) / 2;

      if (radarRef.current && barRef.current && chartH > 30) {
        const scale = 2.5;

        // Radar
        const radarCanvas = await html2canvas(radarRef.current, {
          scale, useCORS: true, backgroundColor: '#ffffff',
          logging: false, allowTaint: true,
        });
        const radarImg = radarCanvas.toDataURL('image/png');

        // Bar
        const barCanvas = await html2canvas(barRef.current, {
          scale, useCORS: true, backgroundColor: '#ffffff',
          logging: false, allowTaint: true,
        });
        const barImg = barCanvas.toDataURL('image/png');

        // Card backgrounds
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(12, chartY, chartW, chartH, 3, 3, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(12, chartY, chartW, chartH, 3, 3, 'S');

        doc.setFillColor(249, 250, 251);
        doc.roundedRect(pageW / 2 + 6, chartY, chartW, chartH, 3, 3, 'F');
        doc.roundedRect(pageW / 2 + 6, chartY, chartW, chartH, 3, 3, 'S');

        // Titles
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text('Vue multidimensionnelle', 17, chartY + 6);
        doc.text('Comparaison E / S / G',  pageW / 2 + 11, chartY + 6);

        // Images
        const imgPad = 4;
        const imgY   = chartY + 10;
        const imgH   = chartH - 14;
        doc.addImage(radarImg, 'PNG', 12 + imgPad, imgY, chartW - imgPad * 2, imgH);
        doc.addImage(barImg,   'PNG', pageW / 2 + 6 + imgPad, imgY, chartW - imgPad * 2, imgH);
      }

      // ── Footer ──────────────────────────────────────────────────────────────
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(12, pageH - 8, pageW - 12, pageH - 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`© ${new Date().getFullYear()} ESG Flow · Document confidentiel · ${selected.length} organisation(s) comparée(s)`, 12, pageH - 4);
      doc.text('Page 1 / 1', pageW - 12, pageH - 4, { align: 'right' });

      doc.save(`comparaison-esg-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setExportLoading(null);
    }
  };

  const exportWord = async () => {
    if (!selected.length) return;
    setExportLoading('word');
    setExportMenuOpen(false);
    try {
      const {
        Document, Packer, Paragraph, Table, TableRow, TableCell,
        TextRun, HeadingLevel, AlignmentType, WidthType,
        BorderStyle, ShadingType, Header, Footer, PageNumber,
        convertInchesToTwip,
      } = await import('docx');

      const dateStr  = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      const NAVY     = '0F172A';
      const GREEN    = '059669';
      const GRAY     = '6B7280';
      const LGRAY    = 'F3F4F6';
      const WHITE    = 'FFFFFF';

      const orgColors: Record<number, string> = {
        0: '6366F1', 1: '10B981', 2: 'F59E0B', 3: 'EF4444', 4: '8B5CF6',
      };

      // Helper: make a thin border object
      const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' };
      const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

      // Helper: data row
      const makeDataRow = (label: string, values: string[], isAlt: boolean) =>
        new TableRow({
          children: [
            new TableCell({
              borders: allBorders,
              shading: { type: ShadingType.CLEAR, fill: LGRAY },
              children: [new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 18, color: NAVY })],
                spacing: { before: 80, after: 80 },
              })],
            }),
            ...values.map(v => new TableCell({
              borders: allBorders,
              shading: { type: ShadingType.CLEAR, fill: isAlt ? 'F9FAFB' : WHITE },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: v, size: 18, color: NAVY })],
                spacing: { before: 80, after: 80 },
              })],
            })),
          ],
        });

      const tableRows = [
        // Header row
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              borders: allBorders,
              shading: { type: ShadingType.CLEAR, fill: NAVY },
              children: [new Paragraph({
                children: [new TextRun({ text: 'Indicateur', bold: true, color: WHITE, size: 18 })],
                spacing: { before: 100, after: 100 },
              })],
            }),
            ...selected.map((org, i) => new TableCell({
              borders: allBorders,
              shading: { type: ShadingType.CLEAR, fill: orgColors[i] ?? '6366F1' },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: org.name, bold: true, color: WHITE, size: 18 })],
                spacing: { before: 100, after: 100 },
              })],
            })),
          ],
        }),
        makeDataRow('Score ESG (/100)',  selected.map(o => String(o.scores.overall    || '—')), false),
        makeDataRow('Rating',            selected.map(o => o.scores.rating),                   true),
        makeDataRow('Environnement',     selected.map(o => String(o.scores.environmental || '—')), false),
        makeDataRow('Social',            selected.map(o => String(o.scores.social        || '—')), true),
        makeDataRow('Gouvernance',       selected.map(o => String(o.scores.governance    || '—')), false),
        makeDataRow('Secteur',           selected.map(o => o.industry || o.sector || '—'),          true),
      ];

      // Insights section
      const insightParagraphs = insights ? [
        new Paragraph({ text: '', spacing: { before: 200 } }),
        new Paragraph({
          children: [new TextRun({ text: 'Insights', bold: true, size: 24, color: NAVY })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        ...[
          ['🏆 Meilleur score global', `${insights.best.name} — ${insights.best.scores.overall}/100`],
          ['📊 Score moyen',           `${insights.avg}/100`],
          ['📏 Écart maximum',         `${Math.round(insights.gap)} points`],
          ['🌿 Leader Environnement',  `${insights.bestEnv.name} — ${insights.bestEnv.scores.environmental}/100`],
        ].map(([label, value]) =>
          new Paragraph({
            children: [
              new TextRun({ text: `${label} : `, bold: true, size: 18, color: NAVY }),
              new TextRun({ text: value, size: 18, color: GRAY }),
            ],
            bullet: { level: 0 },
            spacing: { before: 60, after: 60 },
          })
        ),
      ] : [];

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.9),
                right: convertInchesToTwip(0.9),
                bottom: convertInchesToTwip(0.9),
                left: convertInchesToTwip(0.9),
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'ESG Flow', bold: true, size: 18, color: '4F46E5' }),
                    new TextRun({ text: '  ·  Comparaison ESG des Organisations', size: 18, color: GRAY }),
                  ],
                  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
                  spacing: { after: 0 },
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `© ${new Date().getFullYear()} ESG Flow · Généré le ${dateStr}  ·  `, size: 16, color: GRAY }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GRAY }),
                  ],
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
                }),
              ],
            }),
          },
          children: [
            // Title
            new Paragraph({
              children: [new TextRun({ text: 'Comparaison ESG des Organisations', bold: true, size: 36, color: NAVY })],
              spacing: { before: 0, after: 120 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Généré le ${dateStr}  ·  ${selected.length} organisation(s) comparée(s)`, size: 18, color: GRAY })],
              spacing: { before: 0, after: 300 },
            }),

            // Comparison table
            new Paragraph({
              children: [new TextRun({ text: 'Tableau comparatif', bold: true, size: 24, color: NAVY })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 0, after: 120 },
            }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),

            ...insightParagraphs,

            // Note about charts
            new Paragraph({ text: '', spacing: { before: 300 } }),
            new Paragraph({
              children: [
                new TextRun({
                  text: 'ℹ️ Pour obtenir ce rapport avec les graphiques (radar multidimensionnel, comparaison E/S/G), utilisez l\'export PDF.',
                  italics: true, size: 16, color: GRAY,
                }),
              ],
              spacing: { before: 100, after: 100 },
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `comparaison-esg-${new Date().toISOString().slice(0, 10)}.docx`,
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Word export error:', err);
      toast.error('Erreur lors de la génération du fichier Word. Veuillez réessayer.');
    } finally {
      setExportLoading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner /></div>;

  return (
    <div className="space-y-6" onClick={() => setExportMenuOpen(false)}>

      {/* ── Hero gradient (overflow-hidden for pattern only — no dropdowns inside) ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 px-8 pt-8 pb-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4wOCIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative">
          <BackButton to="/app/organizations" label="Organisations" className="mb-4 text-white/80 hover:text-white" />
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 opacity-80" />
            Comparateur d'organisations ESG
          </h1>
          <p className="text-indigo-100 text-sm">
            Comparez jusqu'à 5 organisations côte-à-côte — scores E / S / G, radar multidimensionnel
          </p>
          {selected.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-semibold">
                {selected.length} organisation{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
              </span>
              {selected.map((org, i) => (
                <span key={org.id} className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${PALETTE[i]}40`, color: 'white', border: `1px solid ${PALETTE[i]}80` }}>
                  {org.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Action toolbar (outside overflow-hidden so dropdown is never clipped) ── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-gray-400">
          {selected.length === 0
            ? 'Sélectionnez des organisations pour activer les exports'
            : `${selected.length} organisation${selected.length > 1 ? 's' : ''} sélectionnée${selected.length > 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href).then(() => {})}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-600 transition-colors shadow-sm"
          >
            <Share2 size={14} /> Partager
          </button>

          {/* Export dropdown — in normal flow, no overflow clipping */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              disabled={!selected.length || exportLoading !== null}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exportLoading === 'pdf' ? 'Génération PDF…'
               : exportLoading === 'word' ? 'Génération Word…'
               : 'Exporter'}
              <ChevronDown size={13} className={`transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[100]">
                {/* PDF */}
                <button
                  onClick={() => exportPDF()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors rounded-xl mx-auto"
                  style={{ width: 'calc(100% - 8px)', marginLeft: 4 }}
                >
                  <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">PDF avec graphiques</p>
                    <p className="text-xs text-gray-400 mt-0.5">Radar + barres inclus</p>
                  </div>
                </button>
                {/* Word */}
                <button
                  onClick={() => exportWord()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors rounded-xl mx-auto"
                  style={{ width: 'calc(100% - 8px)', marginLeft: 4 }}
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Word (.docx)</p>
                    <p className="text-xs text-gray-400 mt-0.5">Tableau complet + insights</p>
                  </div>
                </button>
                {/* Divider + CSV */}
                <div className="border-t border-gray-100 mx-4 my-1" />
                <button
                  onClick={() => { exportCSV(); setExportMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors rounded-xl mx-auto"
                  style={{ width: 'calc(100% - 8px)', marginLeft: 4 }}
                >
                  <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={16} className="text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">CSV (Excel)</p>
                    <p className="text-xs text-gray-400 mt-0.5">Données brutes + insights</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Selection panel ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Organisations sélectionnées
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-normal">
              {selected.length}/5
            </span>
          </h2>
          {selected.length > 0 && (
            <button onClick={() => { setSelected([]); setSearchParams({}); }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <X className="h-3.5 w-3.5" />Tout effacer
            </button>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((org, i) => (
              <span key={org.id}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: PALETTE[i] }}>
                {org.name.length > 22 ? org.name.slice(0, 22) + '…' : org.name}
                <button onClick={() => toggleOrg(org)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une organisation…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredOrgs.map(org => {
            const isSelected = !!selected.find(o => o.id === org.id);
            const idx = selected.findIndex(o => o.id === org.id);
            const isAdding = adding === org.id;
            return (
              <button
                key={org.id}
                onClick={() => toggleOrg(org)}
                disabled={isAdding || (!isSelected && selected.length >= 5)}
                className={`p-3 rounded-lg border-2 text-left transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected ? 'border-transparent text-white' : 'border-gray-100 bg-white hover:border-gray-300 text-gray-700'
                }`}
                style={isSelected ? { backgroundColor: PALETTE[idx] } : undefined}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 font-medium leading-snug">{org.name}</span>
                  {isAdding ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin flex-shrink-0 mt-0.5" />
                  ) : isSelected ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-80" />
                  ) : (
                    <Plus className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
                  )}
                </div>
                {(org.industry || org.sector) && (
                  <p className="text-gray-400 mt-1 truncate" style={isSelected ? { color: 'rgba(255,255,255,0.7)' } : undefined}>
                    {org.industry || org.sector}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ── */}
      {selected.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-xl px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
          <p className="font-semibold text-gray-800 text-lg mb-1">Aucune organisation sélectionnée</p>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Choisissez au moins 2 organisations dans la barre de recherche ci-dessus
            pour comparer leurs scores ESG côte à côte ({allOrgs.length} disponible{allOrgs.length > 1 ? 's' : ''}).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {allOrgs.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    // Auto-pre-select the first 2 orgs as a quick-start —
                    // mirrors the same OrgWithScores shape produced in the
                    // toggle handler above so the rest of the page works
                    // unchanged.
                    const sample = allOrgs.slice(0, 2);
                    const enriched: OrgWithScores[] = await Promise.all(
                      sample.map(async (o) => {
                        const s = await getOrgLatestScore(o.id);
                        return {
                          ...o,
                          scores: s
                            ? {
                                overall:       s.overall_score,
                                environmental: s.environmental_score,
                                social:        s.social_score,
                                governance:    s.governance_score,
                                rating:        s.rating ?? '—',
                              }
                            : EMPTY_SCORES,
                        };
                      })
                    );
                    setSelected(enriched);
                    updateUrl(enriched);
                  }}
                  disabled={allOrgs.length < 2}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Building2 className="h-4 w-4" />
                  Comparer les {Math.min(2, allOrgs.length)} premières organisations
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app/organizations')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-colors"
                >
                  Voir toutes les organisations
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/app/organizations')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Créer ma première organisation
              </button>
            )}
          </div>
        </div>
      )}

      {selected.length >= 1 && (
        <>
          {/* ── KPI insights ── */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Meilleur score',  value: insights.best.scores.overall,              sub: insights.best.name,                 color: 'text-green-600',   bg: 'bg-green-50',   icon: Award },
                { label: 'Score moyen',     value: insights.avg,                              sub: `${selected.length} organisations`,  color: 'text-blue-600',    bg: 'bg-blue-50',    icon: Activity },
                { label: 'Écart max',       value: `${Math.round(insights.gap)} pts`,         sub: 'entre min et max',                  color: 'text-orange-500',  bg: 'bg-orange-50',  icon: TrendingUp },
                { label: 'Leader Env.',     value: insights.bestEnv.scores.environmental,     sub: insights.bestEnv.name,               color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
              ].map(({ label, value, sub, color, bg, icon: Icon }) => (
                <div key={label} className={`${bg} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">{label}</span>
                    <Icon className={`h-4 w-4 ${color} opacity-60`} />
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Comparison table ── */}
          <div ref={tableRef} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Tableau comparatif</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Indicateur</th>
                    {selected.map((org, i) => (
                      <th key={org.id} className="text-center px-4 py-3 text-xs font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PALETTE[i] }} />
                          <span className="truncate max-w-[100px]">{org.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const maxGlobal = Math.max(...selected.map(o => o.scores.overall));
                    return (
                      <tr className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score ESG</td>
                        {selected.map(org => (
                          <td key={org.id} className="px-4 py-3.5 text-center">
                            <span className={`text-2xl font-bold ${scoreColor(org.scores.overall)} ${org.scores.overall === maxGlobal ? 'underline decoration-dotted underline-offset-4' : ''}`}>
                              {org.scores.overall || '—'}
                            </span>
                            {org.scores.overall === maxGlobal && selected.length > 1 && (
                              <Award className="inline-block ml-1 h-3.5 w-3.5 text-yellow-500 mb-1" />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })()}
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</td>
                    {selected.map(org => (
                      <td key={org.id} className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${ratingCls(org.scores.rating)}`}>
                          {org.scores.rating}
                        </span>
                      </td>
                    ))}
                  </tr>
                  {[
                    { label: 'Environnement', key: 'environmental' as const, color: '#16a34a' },
                    { label: 'Social',        key: 'social' as const,        color: '#2563eb' },
                    { label: 'Gouvernance',   key: 'governance' as const,     color: '#7c3aed' },
                  ].map(({ label, key, color }) => {
                    const maxVal = Math.max(...selected.map(o => o.scores[key]));
                    return (
                      <tr key={key} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</td>
                        {selected.map(org => (
                          <td key={org.id} className="px-4 py-3 text-center">
                            <div>
                              <span className={`text-lg font-bold`} style={{ color: org.scores[key] === maxVal && selected.length > 1 ? color : '#374151' }}>
                                {org.scores[key] || '—'}
                              </span>
                              <div className="mt-1 mx-auto w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${org.scores[key]}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Secteur</td>
                    {selected.map(org => (
                      <td key={org.id} className="px-4 py-3 text-center text-xs text-gray-500">
                        {org.industry || org.sector || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Charts ── */}
          {selected.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div ref={radarRef} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vue multidimensionnelle</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
                    {selected.map((org, i) => (
                      <Radar key={org.id} name={org.name} dataKey={org.name}
                        stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div ref={barRef} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Comparaison E / S / G</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="E" fill="#16a34a" name="Environnement" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="S" fill="#2563eb" name="Social"        radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="G" fill="#7c3aed" name="Gouvernance"   radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
