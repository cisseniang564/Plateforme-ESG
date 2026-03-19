import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  showBack = false,
  backTo,
  actions,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="mb-6">
      {showBreadcrumbs && <Breadcrumbs />}
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-3 group transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {t('common.back')}
            </button>
          )}
          
          <h1 className="text-3xl font-bold text-gray-900 truncate">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
