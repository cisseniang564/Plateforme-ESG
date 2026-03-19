import { useState } from 'react';
import { Filter, X, Save, Download, ChevronDown } from 'lucide-react';
import Button from '@/components/common/Button';

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'text';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

interface AdvancedFiltersProps {
  filters: FilterConfig[];
  onApply: (values: Record<string, any>) => void;
  onReset: () => void;
  onSave?: (name: string, values: Record<string, any>) => void;
}

export default function AdvancedFilters({ 
  filters, 
  onApply, 
  onReset,
  onSave 
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>({});
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; values: Record<string, any> }>>([]);

  const handleApply = () => {
    onApply(values);
    setIsOpen(false);
  };

  const handleReset = () => {
    setValues({});
    onReset();
  };

  const handleSaveFilter = () => {
    const name = prompt('Nom du filtre:');
    if (name) {
      const newFilter = { name, values };
      setSavedFilters(prev => [...prev, newFilter]);
      if (onSave) onSave(name, values);
      alert(`Filtre "${name}" sauvegardé !`);
    }
  };

  const loadSavedFilter = (filter: typeof savedFilters[0]) => {
    setValues(filter.values);
    onApply(filter.values);
  };

  const activeFilterCount = Object.keys(values).filter(k => {
    const val = values[k];
    return val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true);
  }).length;

  return (
    <div className="relative">
      {/* Bouton principal */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        className="relative"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filtres
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Panel de filtres */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filtres Avancés</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto space-y-4">
            {filters.map(filter => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                
                {filter.type === 'select' && (
                  <select
                    value={values[filter.id] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [filter.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Tous</option>
                    {filter.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'multiselect' && (
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {filter.options?.map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={(values[filter.id] as string[] || []).includes(opt.value)}
                          onChange={(e) => {
                            const current = (values[filter.id] as string[]) || [];
                            const updated = e.target.checked
                              ? [...current, opt.value]
                              : current.filter(v => v !== opt.value);
                            setValues(prev => ({ ...prev, [filter.id]: updated }));
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {filter.type === 'range' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Min"
                        min={filter.min}
                        max={filter.max}
                        value={values[`${filter.id}_min`] || ''}
                        onChange={(e) => setValues(prev => ({ ...prev, [`${filter.id}_min`]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        min={filter.min}
                        max={filter.max}
                        value={values[`${filter.id}_max`] || ''}
                        onChange={(e) => setValues(prev => ({ ...prev, [`${filter.id}_max`]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}

                {filter.type === 'text' && (
                  <input
                    type="text"
                    placeholder={`Rechercher ${filter.label.toLowerCase()}...`}
                    value={values[filter.id] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [filter.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Filtres sauvegardés */}
          {savedFilters.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">FILTRES SAUVEGARDÉS</p>
              <div className="space-y-1">
                {savedFilters.map((filter, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadSavedFilter(filter)}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
            <div className="flex gap-2">
              {onSave && activeFilterCount > 0 && (
                <Button
                  onClick={handleSaveFilter}
                  variant="secondary"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Sauvegarder
                </Button>
              )}
              <Button
                onClick={handleApply}
                size="sm"
              >
                Appliquer ({activeFilterCount})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
