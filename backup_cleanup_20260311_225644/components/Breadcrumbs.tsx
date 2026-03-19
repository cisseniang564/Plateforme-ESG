import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  const breadcrumbs: Array<{ label: string; path?: string }> = [
    { label: t('common.home'), path: '/' },
  ];
  
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = t(`breadcrumbs.${segment}`, segment);
    
    if (index === pathSegments.length - 1) {
      breadcrumbs.push({ label, path: undefined });
    } else {
      breadcrumbs.push({ label, path: currentPath });
    }
  });

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
          
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="hover:text-primary-600 transition-colors flex items-center gap-1"
            >
              {index === 0 && <Home className="h-4 w-4" />}
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium flex items-center gap-1">
              {index === 0 && <Home className="h-4 w-4" />}
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
