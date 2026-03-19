import { useTranslation } from 'react-i18next';
import { X, Activity, TrendingUp, Grid, BarChart } from 'lucide-react';
import Button from './common/Button';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string) => void;
  availableWidgets: Array<{ id: string; name: string; icon: any }>;
}

export default function AddWidgetModal({ isOpen, onClose, onAddWidget, availableWidgets }: AddWidgetModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Add Widget
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Widget Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {availableWidgets.map((widget) => {
              const Icon = widget.icon;
              return (
                <button
                  key={widget.id}
                  onClick={() => {
                    onAddWidget(widget.id);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <span className="font-medium text-gray-900">{widget.name}</span>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
