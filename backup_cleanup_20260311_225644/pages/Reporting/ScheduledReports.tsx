import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import { Plus, Clock, Trash2, Calendar } from 'lucide-react';
import reportsService from '@/services/reportsService';

interface Schedule {
  id: string;
  name?: string;
  title?: string;
  frequency?: string;
  next_run?: string;
  report_type?: string;
  status?: string;
}

export default function ScheduledReports() {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      // Try to fetch scheduled reports; if endpoint not available, show empty state
      const data = await reportsService.getReports();
      const items = Array.isArray(data) ? data : data?.schedules || data?.items || [];
      setSchedules(items.filter((r: any) => r.frequency || r.next_run));
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('reports.scheduled', 'Scheduled Reports')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('reports.scheduledSubtitle', 'Automate recurring ESG report generation')}
          </p>
        </div>
        <Button>
          <Plus className="h-5 w-5 mr-2" />
          {t('reports.newSchedule', 'New Schedule')}
        </Button>
      </div>

      <Card>
        {schedules.length > 0 ? (
          <div className="space-y-3">
            {schedules.map(schedule => {
              const name = schedule.name || schedule.title || `Schedule ${schedule.id.slice(0, 8)}`;
              return (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {schedule.frequency && (
                          <span className="text-sm text-gray-600 capitalize">{schedule.frequency}</span>
                        )}
                        {schedule.next_run && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Next: {new Date(schedule.next_run).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm">
                      {t('common.edit', 'Edit')}
                    </Button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('common.delete', 'Delete')}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {t('reports.noSchedules', 'No scheduled reports yet')}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {t('reports.scheduleFirst', 'Set up automated reports to run on a schedule')}
            </p>
            <Button className="mt-5">
              <Plus className="h-5 w-5 mr-2" />
              {t('reports.newSchedule', 'Create First Schedule')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
