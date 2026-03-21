import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  TrendingUp,
  Clock,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface QualityStats {
  total_entries: number;
  pending: number;
  verified: number;
  rejected: number;
  flagged: number;
  completeness_score: number;
  avg_quality_score: number;
  entries_with_source: number;
  entries_with_attachments: number;
  stale_entries: number;
}

interface QualityIssue {
  id: string;
  metric_name: string;
  issue_type: string;
  severity: string;
  details: string;
  created_at: string;
}

export default function DataQualityDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [statsRes, issuesRes] = await Promise.all([
        api.get('/data-validation/quality/stats'),
        api.get('/data-validation/quality/issues')
      ]);

      setStats(statsRes.data);
      setIssues(issuesRes.data);
    } catch (error: any) {
      console.error('Error loading quality data:', error);
      toast.error(t('dataQuality.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (issueId: string, action: 'verify' | 'reject' | 'flag') => {
    setValidating(issueId);

    try {
      await api.post(`/data-validation/entries/${issueId}/validate`, {
        action,
        reason: action === 'reject' ? 'Quality check failed' : undefined
      });

      toast.success(
        action === 'verify' ? t('dataQuality.verified') :
        action === 'reject' ? t('dataQuality.rejected') :
        t('dataQuality.flagged')
      );

      await loadData();
    } catch (error: any) {
      console.error('Error validating:', error);
      toast.error(t('dataQuality.validationError'));
    } finally {
      setValidating(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing_source': return FileText;
      case 'stale': return Clock;
      case 'flagged': return Flag;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return <div>{t('dataQuality.loadError')}</div>;
  }

  const qualityPercentage = stats.total_entries > 0
    ? ((stats.verified / stats.total_entries) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Shield className="h-10 w-10" />
              {t('dataQuality.title')}
            </h1>
            <p className="text-blue-100 text-lg">
              {t('dataQuality.subtitle')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('dataQuality.refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-fade-in">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dataQuality.totalData')}</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_entries}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dataQuality.verifiedStat')}</p>
              <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
              <p className="text-xs text-gray-500 mt-1">{qualityPercentage}% {t('dataQuality.ofTotal')}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dataQuality.pending')}</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dataQuality.rejectedStat')}</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('dataQuality.flaggedStat')}</p>
              <p className="text-3xl font-bold text-orange-600">{stats.flagged}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl">
              <Flag className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {t('dataQuality.completenessScore')}
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('dataQuality.dataWithSource')}</span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.completeness_score.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completeness_score}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('dataQuality.withDocumentedSource')}</span>
                <span className="font-medium">{stats.entries_with_source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('dataQuality.withAttachments')}</span>
                <span className="font-medium">{stats.entries_with_attachments}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            {t('dataQuality.avgQualityScore')}
          </h3>
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-green-600">
                {stats.avg_quality_score.toFixed(0)}
              </p>
              <p className="text-sm text-gray-600 mt-2">{t('dataQuality.outOf100')}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            {t('dataQuality.staleData')}
          </h3>
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-orange-600">
                {stats.stale_entries}
              </p>
              <p className="text-sm text-gray-600 mt-2">{t('dataQuality.staleDays')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Issues List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            {t('dataQuality.issuesTitle', { count: issues.length })}
          </h2>
        </div>

        {issues.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <p className="text-xl text-gray-900 font-semibold mb-2">
              {t('dataQuality.noIssues')}
            </p>
            <p className="text-gray-600">
              {t('dataQuality.allGoodQuality')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => {
              const Icon = getIssueIcon(issue.issue_type);

              return (
                <div
                  key={issue.id}
                  className={`p-4 border-2 rounded-lg ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-5 w-5" />
                        <h3 className="font-semibold">{issue.metric_name}</h3>
                        <span className="px-2 py-1 text-xs font-bold uppercase rounded">
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{issue.details}</p>
                      <p className="text-xs opacity-75">
                        {format(new Date(issue.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleValidate(issue.id, 'verify')}
                        disabled={validating === issue.id}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('dataQuality.verifyAction')}
                      >
                        {validating === issue.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <ThumbsUp className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleValidate(issue.id, 'reject')}
                        disabled={validating === issue.id}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('dataQuality.rejectAction')}
                      >
                        <ThumbsDown className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleValidate(issue.id, 'flag')}
                        disabled={validating === issue.id}
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                        title={t('dataQuality.flagAction')}
                      >
                        <Flag className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
