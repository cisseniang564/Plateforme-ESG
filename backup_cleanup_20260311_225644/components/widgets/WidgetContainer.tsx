import { ReactNode, useState } from 'react';
import { MoreVertical, Maximize2, Minimize2, X } from 'lucide-react';

interface WidgetContainerProps {
  title: string;
  children: ReactNode;
  onRemove?: () => void;
  collapsible?: boolean;
  actions?: ReactNode;
}

export default function WidgetContainer({ 
  title, 
  children, 
  onRemove,
  collapsible = true,
  actions
}: WidgetContainerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        
        <div className="flex items-center gap-2">
          {actions}
          
          {collapsible && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {collapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          )}
          
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {menuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  {onRemove && (
                    <button
                      onClick={() => {
                        onRemove();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 inline mr-2" />
                      Remove Widget
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
