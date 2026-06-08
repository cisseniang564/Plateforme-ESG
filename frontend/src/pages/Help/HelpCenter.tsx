/**
 * HelpCenter — Searchable user documentation & knowledge base.
 * Public page accessible at /help (no auth required).
 */
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Leaf, BookOpen, BarChart3, Shield, Zap, FileText,
  Settings, ChevronRight, ChevronDown, HelpCircle, Mail,
  MessageSquare, ExternalLink, Play, CheckCircle, ArrowLeft,
  Globe, Lock, Users, Database, Truck, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

interface Category {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  desc: string;
  articles: Article[];
}

// ─── Knowledge base (structure only — text comes from i18n) ─────────────────────
const CATEGORY_META: { id: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'getting-started', icon: Play, color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'carbon', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'csrd', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'supply-chain', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'security', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' },
  { id: 'api', icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HelpCenter() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  // Build categories from structure + i18n content
  const CATEGORIES: Category[] = useMemo(() => CATEGORY_META.map(m => ({
    ...m,
    title: t(`help.categories.${m.id}.title`),
    desc: t(`help.categories.${m.id}.desc`),
    articles: t(`help.categories.${m.id}.articles`, { returnObjects: true }) as Article[],
  })), [t, i18n.language]);

  // Flatten all articles for search
  const allArticles = useMemo(() =>
    CATEGORIES.flatMap(cat => cat.articles.map(a => ({ ...a, catId: cat.id, catTitle: cat.title }))),
    [CATEGORIES]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(tag => tag.includes(q)) ||
      a.content.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allArticles]);

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory);

  // Simple markdown renderer (bold, h2, h3, lists, tables, code blocks)
  function renderMarkdown(md: string) {
    const lines = md.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (!tableRows.length) return;
      const header = tableRows[0];
      const body = tableRows.slice(2); // skip separator row
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {header.map((h, i) => <th key={i} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">{h.trim()}</th>)}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  {row.map((cell, ci) => <td key={ci} className="border border-gray-200 px-3 py-2 text-gray-600">{cell.trim()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true; codeLines = [];
        } else {
          elements.push(<pre key={i} className="bg-slate-900 text-green-300 rounded-xl p-4 overflow-x-auto text-sm font-mono my-4"><code>{codeLines.join('\n')}</code></pre>);
          inCodeBlock = false;
        }
        return;
      }
      if (inCodeBlock) { codeLines.push(line); return; }

      if (line.startsWith('|')) {
        inTable = true;
        tableRows.push(line.split('|').filter(Boolean));
        return;
      }
      if (inTable) flushTable();

      if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-lg font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-1">{line.slice(4)}</h3>);
      } else if (line.startsWith('> ')) {
        elements.push(<blockquote key={i} className="border-l-4 border-green-400 pl-4 py-1 bg-green-50 rounded-r-xl text-sm text-green-800 my-3">{line.slice(2)}</blockquote>);
      } else if (line.match(/^[0-9]+\. /)) {
        elements.push(<li key={i} className="list-decimal list-inside text-gray-600 text-sm mb-1 ml-2">{line.replace(/^[0-9]+\. /, '')}</li>);
      } else if (line.startsWith('- ')) {
        const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(<li key={i} className="list-disc list-inside text-gray-600 text-sm mb-1 ml-2" dangerouslySetInnerHTML={{ __html: text }} />);
      } else if (line.trim()) {
        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-600 underline hover:text-green-700">$1</a>');
        elements.push(<p key={i} className="text-gray-600 text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: html }} />);
      }
    });
    if (inTable) flushTable();
    return elements;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-green-950 to-emerald-900 text-white px-8 py-10 shadow-xl">
        <div>
          {/* Top bar: back button + logo */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {t('help.back')}
            </button>
            <Link to="/app/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Leaf className="h-3.5 w-3.5 text-white" />
              </div>
              ESGFlow
            </Link>
          </div>
          <h1 className="text-4xl font-extrabold mb-3">{t('help.title')}</h1>
          <p className="text-slate-300 mb-8">{t('help.subtitle')}</p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveArticle(null); setActiveCategory(null); }}
              placeholder={t('help.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:bg-white/15 focus:border-white/40 transition-all text-sm backdrop-blur-sm"
            />
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {searchResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setActiveArticle(a); setQuery(''); }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <BookOpen className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                    <div className="text-xs text-gray-400">{(a as any).catTitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {query && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">{t('help.noResults', { query })}</p>
          )}
        </div>
      </div>

      <div>

        {/* Article view */}
        {activeArticle ? (
          <div>
            <button
              onClick={() => setActiveArticle(null)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t('help.back')}
            </button>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">{activeArticle.title}</h1>
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(activeArticle.content)}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
                <p className="text-sm text-gray-500">{t('help.helpful')}</p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-green-50 hover:border-green-300 transition-colors text-gray-600">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" /> {t('help.yes')}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-red-50 hover:border-red-200 transition-colors text-gray-600">
                  {t('help.notReally')}
                </button>
              </div>
            </div>
          </div>

        ) : activeCategory && currentCategory ? (
          /* Category articles list */
          <div>
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> {t('help.allCategories')}
            </button>
            <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl ${currentCategory.bg}`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <currentCategory.icon className={`h-5 w-5 ${currentCategory.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{currentCategory.title}</h2>
                <p className="text-sm text-gray-600">{currentCategory.desc}</p>
              </div>
            </div>
            <div className="space-y-3">
              {currentCategory.articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => setActiveArticle(article)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-green-300 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition-colors">{article.title}</div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {article.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>

        ) : (
          /* Category grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="group flex flex-col items-start p-5 bg-white rounded-2xl border border-gray-100 hover:border-green-300 hover:shadow-md transition-all text-left"
                >
                  <div className={`w-11 h-11 ${cat.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                    <cat.icon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">{cat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{cat.desc}</p>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    {t('help.articlesCount', { count: cat.articles.length })} <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>

            {/* Popular articles */}
            <div className="mb-12">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('help.popularArticles')}</h2>
              <div className="space-y-2">
                {allArticles.slice(0, 5).map(a => (
                  <button
                    key={a.id}
                    onClick={() => setActiveArticle(a)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-green-300 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 transition-colors">{a.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-green-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Contact support */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="mailto:support@esgflow.com" className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-blue-300 transition-all text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('help.contactEmail')}</div>
                  <div className="text-xs text-gray-500">{t('help.contactEmailDesc')}</div>
                </div>
              </a>
              <Link to="/support" className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-green-300 transition-all text-center">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('help.contactSupport')}</div>
                  <div className="text-xs text-gray-500">{t('help.contactSupportDesc')}</div>
                </div>
              </Link>
              <Link to="/app/api-docs" className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 hover:border-indigo-300 transition-all text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ExternalLink className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('help.contactApi')}</div>
                  <div className="text-xs text-gray-500">{t('help.contactApiDesc')}</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
