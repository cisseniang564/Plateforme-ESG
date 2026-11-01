import { ArrowLeft, FileText } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageSeo } from '@/hooks/usePageSeo';
import { TERMS_MD, TERMS_UPDATED, TERMS_VERSION } from './termsContent';

// Texte en gras (**…**) et passages à compléter ([…]) mis en évidence.
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('[')) return <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">{part}</mark>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

type Block =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; rows: string[][] };

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of md.trim().split(/\n{2,}/)) {
    const lines = chunk.split('\n');
    if (chunk.startsWith('### ')) blocks.push({ kind: 'h', text: chunk.slice(4) });
    else if (lines.every((l) => l.startsWith('- '))) blocks.push({ kind: 'ul', items: lines.map((l) => l.slice(2)) });
    else if (lines.every((l) => l.startsWith('|'))) {
      const rows = lines.filter((l) => !/^\|\s*-/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      blocks.push({ kind: 'table', rows });
    } else blocks.push({ kind: 'p', text: chunk });
  }
  return blocks;
}

const BLOCKS = parse(TERMS_MD);

export default function Terms() {
  const navigate = useNavigate();
  usePageSeo({
    id: 'terms',
    title: "Conditions générales d'utilisation et de vente — ESGFlow",
    description: "Conditions générales d'utilisation et de vente de la plateforme ESGFlow : service, traitements automatisés, tarifs, résiliation, données.",
    url: 'https://greenconnect.cloud/cgv',
    robots: 'noindex,follow',
    ogImage: 'https://greenconnect.cloud/og/cgv.png',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center gap-2 tap-target">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="rounded-2xl bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-3"><FileText className="h-8 w-8 text-emerald-600" /></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Conditions générales d'utilisation et de vente</h1>
              <p className="mt-1 text-sm text-gray-500">Version {TERMS_VERSION} · dernière mise à jour : {TERMS_UPDATED}</p>
            </div>
          </div>
          <div className="prose prose-gray max-w-none">
            {BLOCKS.map((b, i) => {
              if (b.kind === 'h') return <h2 key={i}>{b.text}</h2>;
              if (b.kind === 'p') return <p key={i}>{inline(b.text)}</p>;
              if (b.kind === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
              const [head, ...body] = b.rows;
              return (
                <div key={i} className="overflow-x-auto">
                  <table>
                    <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
                    <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
