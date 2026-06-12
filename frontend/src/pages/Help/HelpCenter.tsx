/**
 * HelpCenter — Searchable user documentation & knowledge base.
 * Public page accessible at /help (no auth required).
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Leaf, BookOpen, BarChart3, Shield, Zap, FileText,
  Settings, ChevronRight, HelpCircle, Mail,
  MessageSquare, ExternalLink, Play, CheckCircle, ArrowLeft,
  Globe, Lock, Users, Database, Truck, TrendingUp,
  Sparkles, Clock, ThumbsUp, ThumbsDown, Hash, ArrowRight,
  LifeBuoy, Rocket, Star, ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isNew?: boolean;
  readTime?: number; // minutes
}

interface Category {
  id: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  title: string;
  desc: string;
  articles: Article[];
}

// ─── Knowledge base ───────────────────────────────────────────────────────────
type TFn = (key: string, opts?: any) => string;

function buildCategories(t: TFn): Category[] {
  return [
    {
      id: 'getting-started', icon: Rocket,
      gradient: 'from-emerald-500 to-teal-500', iconColor: 'text-emerald-600',
      title: t('help.cat.gs.title'), desc: t('help.cat.gs.desc'),
      articles: [
        { id: 'gs-1', title: t('help.art.gs1.title'), tags: t('help.art.gs1.tags').split(','), readTime: 3, content: t('help.art.gs1.content') },
        { id: 'gs-2', title: t('help.art.gs2.title'), tags: t('help.art.gs2.tags').split(','), isNew: true, readTime: 4, content: t('help.art.gs2.content') },
        { id: 'gs-3', title: t('help.art.gs3.title'), tags: t('help.art.gs3.tags').split(','), readTime: 3, content: t('help.art.gs3.content') },
      ],
    },
    {
      id: 'carbon', icon: TrendingUp,
      gradient: 'from-orange-500 to-red-500', iconColor: 'text-orange-600',
      title: t('help.cat.carbon.title'), desc: t('help.cat.carbon.desc'),
      articles: [
        { id: 'c-1', title: t('help.art.c1.title'), tags: t('help.art.c1.tags').split(','), readTime: 5, content: t('help.art.c1.content') },
        { id: 'c-2', title: t('help.art.c2.title'), tags: t('help.art.c2.tags').split(','), isNew: true, readTime: 6, content: t('help.art.c2.content') },
      ],
    },
    {
      id: 'csrd', icon: FileText,
      gradient: 'from-blue-500 to-indigo-500', iconColor: 'text-blue-600',
      title: t('help.cat.csrd.title'), desc: t('help.cat.csrd.desc'),
      articles: [
        { id: 'r-1', title: t('help.art.r1.title'), tags: t('help.art.r1.tags').split(','), readTime: 5, content: t('help.art.r1.content') },
        { id: 'r-2', title: t('help.art.r2.title'), tags: t('help.art.r2.tags').split(','), readTime: 3, content: t('help.art.r2.content') },
      ],
    },
    {
      id: 'supply-chain', icon: Truck,
      gradient: 'from-purple-500 to-violet-500', iconColor: 'text-purple-600',
      title: t('help.cat.supply.title'), desc: t('help.cat.supply.desc'),
      articles: [
        { id: 'sc-1', title: t('help.art.sc1.title'), tags: t('help.art.sc1.tags').split(','), readTime: 5, content: t('help.art.sc1.content') },
      ],
    },
    {
      id: 'security', icon: Shield,
      gradient: 'from-slate-600 to-gray-700', iconColor: 'text-slate-600',
      title: t('help.cat.security.title'), desc: t('help.cat.security.desc'),
      articles: [
        { id: 'sec-1', title: t('help.art.sec1.title'), tags: t('help.art.sec1.tags').split(','), readTime: 3, content: t('help.art.sec1.content') },
        { id: 'sec-2', title: t('help.art.sec2.title'), tags: t('help.art.sec2.tags').split(','), readTime: 4, content: t('help.art.sec2.content') },
      ],
    },
    {
      id: 'api', icon: Database,
      gradient: 'from-indigo-500 to-blue-600', iconColor: 'text-indigo-600',
      title: t('help.cat.api.title'), desc: t('help.cat.api.desc'),
      articles: [
        { id: 'api-1', title: t('help.art.api1.title'), tags: t('help.art.api1.tags').split(','), readTime: 4, content: t('help.art.api1.content') },
        { id: 'api-2', title: t('help.art.api2.title'), tags: t('help.art.api2.tags').split(','), readTime: 5, content: t('help.art.api2.content') },
      ],
    },
  ];
}

function buildPopularTags(t: TFn): string[] {
  return t('help.popularTags').split(',');
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(md: string) {
  const lines = md.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codelang = '';
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    const header = tableRows[0];
    const body = tableRows.slice(2);
    elements.push(
      <div key={`table-${elements.length}`} className="overflow-x-auto my-5 rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {header.map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {body.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-gray-600" dangerouslySetInnerHTML={{ __html: cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
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
        inCodeBlock = true;
        codeLines = [];
        codelang = line.slice(3).trim();
      } else {
        elements.push(
          <div key={i} className="my-5 rounded-xl overflow-hidden shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{codelang || 'code'}</span>
            </div>
            <pre className="bg-slate-900 text-emerald-300 p-5 overflow-x-auto text-sm font-mono leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codelang = '';
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
      elements.push(
        <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-3 pb-2 border-b border-gray-100">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-gray-800 mt-5 mb-2">{line.slice(4)}</h3>
      );
    } else if (line.startsWith('> ')) {
      const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      elements.push(
        <blockquote key={i} className="flex gap-3 border-l-4 border-emerald-400 pl-4 py-3 bg-emerald-50 rounded-r-xl my-4">
          <span className="text-emerald-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
        </blockquote>
      );
    } else if (line.match(/^[0-9]+\. /)) {
      const text = line.replace(/^[0-9]+\. /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
      elements.push(
        <div key={i} className="flex gap-3 mb-2 ml-1">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
            {line.match(/^([0-9]+)\./)?.[1]}
          </span>
          <span className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    } else if (line.startsWith('- ')) {
      const text = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
      elements.push(
        <div key={i} className="flex gap-2.5 mb-1.5 ml-1">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
          <span className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
    } else if (line.trim()) {
      const html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-emerald-600 underline hover:text-emerald-700">$1</a>');
      elements.push(
        <p key={i} className="text-gray-600 text-sm leading-relaxed mb-3" dangerouslySetInnerHTML={{ __html: html }} />
      );
    }
  });
  if (inTable) flushTable();
  return elements;
}

// ─── Article View ─────────────────────────────────────────────────────────────
function ArticleView({
  article,
  category,
  onBack,
}: {
  article: Article;
  category?: Category;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <button onClick={onBack} className="hover:text-emerald-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('help.helpCenter')}
        </button>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <button onClick={onBack} className="hover:text-emerald-600 transition-colors">{category.title}</button>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-600 truncate max-w-xs">{article.title}</span>
      </nav>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Article header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          {article.isNew && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mb-3 border border-emerald-200">
              <Sparkles className="h-3 w-3" /> {t('help.new')}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-4">{article.title}</h1>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {article.readTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t('help.minRead', { count: article.readTime })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              {article.tags.slice(0, 3).join(' · ')}
            </span>
          </div>
        </div>

        {/* Article body */}
        <div className="px-8 py-7">
          {renderMarkdown(article.content)}
        </div>

        {/* Feedback */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
          {feedback ? (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              {t('help.feedbackThanks')}{' '}
              {feedback === 'down' && (
                <a href="mailto:support@greenconnect.cloud" className="text-emerald-600 hover:underline font-medium">
                  {t('help.contactSupport')} →
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-gray-700">{t('help.feedbackQuestion')}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFeedback('up')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all text-gray-500"
                >
                  <ThumbsUp className="h-3.5 w-3.5" /> {t('help.feedbackYes')}
                </button>
                <button
                  onClick={() => setFeedback('down')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-gray-500"
                >
                  <ThumbsDown className="h-3.5 w-3.5" /> {t('help.feedbackNo')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related link */}
      <div className="mt-6 p-5 rounded-2xl border border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <LifeBuoy className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          {t('help.notFoundQuestion')}
        </div>
        <a
          href="mailto:support@greenconnect.cloud"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {t('help.contactSupport')} <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HelpCenter() {
  const { t } = useTranslation();
  const CATEGORIES = useMemo(() => buildCategories(t), [t]);
  const POPULAR_TAGS = useMemo(() => buildPopularTags(t), [t]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [activeArticleCategory, setActiveArticleCategory] = useState<Category | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  const allArticles = useMemo(() =>
    CATEGORIES.flatMap(cat => cat.articles.map(a => ({ ...a, catId: cat.id, catTitle: cat.title, catObj: cat }))),
    [CATEGORIES]
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.tags.some(t => t.includes(q)) ||
      a.content.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allArticles]);

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory);

  const openArticle = (article: Article, cat?: Category) => {
    setActiveArticle(article);
    setActiveArticleCategory(cat);
    setQuery('');
  };

  const goBack = () => {
    setActiveArticle(null);
    setActiveArticleCategory(undefined);
  };

  const totalArticles = CATEGORIES.reduce((acc, c) => acc + c.articles.length, 0);

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* ── Sticky top navigation ──────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderColor: '#e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo — click to go home */}
            <button
              onClick={() => {
                setActiveArticle(null);
                setActiveArticleCategory(undefined);
                setActiveCategory(null);
                setQuery('');
              }}
              className="flex items-center gap-2.5 group"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)' }}
              >
                <Leaf className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm hidden sm:block">ESG Flow</span>
              <span className="text-gray-300 hidden sm:block">·</span>
              <span className="text-sm text-gray-500 hidden sm:block">{t('help.helpCenter')}</span>
            </button>

            {/* Title (mobile only) */}
            <span className="text-sm font-medium text-gray-500 sm:hidden">{t('help.helpCenter')}</span>

            {/* Back to app */}
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-emerald-50"
              style={{ color: '#059669', borderColor: '#a7f3d0' }}
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">{t('help.backToApp')}</span>
              <span className="sm:hidden">App</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Page content (max-width constrained) ──────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Article view ──────────────────────────────────────────────────── */}
        {activeArticle && (
          <ArticleView article={activeArticle} category={activeArticleCategory} onBack={goBack} />
        )}

        {/* ── Category view ─────────────────────────────────────────────────── */}
        {!activeArticle && activeCategory && currentCategory && (
          <div>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <button
                onClick={() => setActiveCategory(null)}
                className="hover:text-emerald-600 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('help.helpCenter')}
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-700 font-medium">{currentCategory.title}</span>
            </nav>

            {/* Category banner */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-sm">
              <div className={`bg-gradient-to-r ${currentCategory.gradient} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                    <currentCategory.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentCategory.title}</h2>
                    <p className="text-white/75 text-sm mt-0.5">{currentCategory.desc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Articles list */}
            <div className="space-y-3">
              {currentCategory.articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => openArticle(article, currentCategory)}
                  className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 hover:border-emerald-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 transition-colors">
                      <BookOpen className="h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {article.title}
                        </span>
                        {article.isNew && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                            {t('help.new')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {article.readTime && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" /> {article.readTime} min
                          </span>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {article.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Home view ─────────────────────────────────────────────────────── */}
        {!activeArticle && !activeCategory && (
          <div>

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <div
              className="rounded-3xl text-white px-8 py-12 shadow-2xl mb-8 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 45%, #134e4a 75%, #0f172a 100%)' }}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-20 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl" />

              <div className="relative">
                {/* Headline */}
                <div className="max-w-2xl mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-full text-emerald-300 text-xs font-semibold mb-5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {t('help.heroBadge', { articles: totalArticles, categories: CATEGORIES.length })}
                  </div>
                  <h1 className="text-4xl font-extrabold mb-3 leading-tight">
                    {t('help.heroTitle1')}<br />
                    <span className="text-emerald-400">{t('help.heroTitle2')}</span>
                  </h1>
                  <p className="text-slate-300 text-base">
                    {t('help.heroSubtitle')}
                  </p>
                </div>

                {/* Search */}
                <div className="relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('help.searchPlaceholder')}
                    className="w-full pl-12 pr-16 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:bg-white/15 focus:border-emerald-400/50 transition-all text-sm backdrop-blur-sm shadow-xl"
                  />
                  <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white/40 font-mono hidden sm:block">
                    ⌘K
                  </kbd>
                </div>

                {/* Search results dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {searchResults.map(a => (
                      <button
                        key={a.id}
                        onClick={() => openArticle(a, a.catObj)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${a.catObj.gradient} flex items-center justify-center flex-shrink-0`}>
                          <a.catObj.icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{a.title}</div>
                          <div className="text-xs text-gray-400">{a.catTitle}</div>
                        </div>
                        {a.readTime && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{a.readTime} min</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {query && searchResults.length === 0 && (
                  <p className="mt-3 text-sm text-slate-400">{t('help.noResults', { query })}</p>
                )}

                {/* Popular tags */}
                {!query && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="text-xs text-white/40 self-center mr-1">{t('help.popular')} :</span>
                    {POPULAR_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => { setQuery(tag); searchRef.current?.focus(); }}
                        className="px-3 py-1.5 hover:bg-white/15 border border-white/15 hover:border-white/30 text-white/70 hover:text-white text-xs rounded-lg transition-all"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Category Grid ─────────────────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">{t('help.browseByCategory')}</h2>
                <span className="text-sm text-gray-400">{CATEGORIES.length} {t('help.categoriesLabel')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="group relative flex flex-col items-start p-5 bg-white rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-lg transition-all text-left overflow-hidden"
                  >
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-8 transition-opacity`} />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                      <cat.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">{cat.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4 flex-1">{cat.desc}</p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 group-hover:text-emerald-600 transition-colors">
                      <BookOpen className="h-3.5 w-3.5" />
                      {t('help.articleCount', { count: cat.articles.length })}
                      <ChevronRight className="h-3 w-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Popular articles ──────────────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">{t('help.popularArticles')}</h2>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-emerald-500" /> {t('help.mostViewed')}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm overflow-hidden">
                {allArticles.slice(0, 6).map((a, idx) => (
                  <button
                    key={a.id}
                    onClick={() => openArticle(a, a.catObj)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-emerald-50 text-gray-400 group-hover:text-emerald-600 text-xs font-bold flex items-center justify-center transition-colors">
                      {idx + 1}
                    </span>
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${a.catObj.gradient} flex items-center justify-center flex-shrink-0`}>
                      <a.catObj.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors truncate">
                          {a.title}
                        </span>
                        {a.isNew && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                            {t('help.new')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{a.catTitle}</span>
                    </div>
                    {a.readTime && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" /> {a.readTime} min
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* ── Contact / Support ─────────────────────────────────────────── */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-5">{t('help.noAnswer')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Email support */}
                <a
                  href="mailto:support@greenconnect.cloud"
                  className="group flex flex-col gap-4 p-6 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{t('help.supportEmail')}</div>
                    <div className="text-sm text-gray-500 mb-3">{t('help.supportEmailDesc')}</div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
                      {t('help.sendEmail')} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>

                {/* Ticket support */}
                <Link
                  to="/support"
                  className="group flex flex-col gap-4 p-6 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-emerald-50 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center transition-colors">
                    <MessageSquare className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{t('help.supportTicket')}</div>
                    <div className="text-sm text-gray-500 mb-3">{t('help.supportTicketDesc')}</div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                      {t('help.openTicket')} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>

                {/* API docs */}
                <Link
                  to="/app/api-docs"
                  className="group flex flex-col gap-4 p-6 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-colors">
                    <ExternalLink className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 mb-1">{t('help.apiDocs')}</div>
                    <div className="text-sm text-gray-500 mb-3">{t('help.apiDocsDesc')}</div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                      {t('help.viewApiDocs')} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </div>

              {/* Bottom strip */}
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t('help.trialTitle')}</div>
                    <div className="text-xs text-gray-500">{t('help.trialDesc')}</div>
                  </div>
                </div>
                <Link
                  to="/register"
                  className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  {t('help.startFree')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
