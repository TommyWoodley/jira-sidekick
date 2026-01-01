import { useState, useMemo } from 'react';
import type { JiraFilter } from '../../shared';

interface FilterPickerProps {
  filters: JiraFilter[];
  selectedFilterId: string | null;
  onSelectFilter: (filterId: string | null) => void;
  onSave: () => void;
  error: string | null;
}

export function FilterPicker({
  filters,
  selectedFilterId,
  onSelectFilter,
  onSave,
  error,
}: FilterPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFilters = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return filters.filter((f) => f.name.toLowerCase().includes(term));
  }, [filters, searchTerm]);

  const showDefault = searchTerm === '' || 'my issues'.includes(searchTerm.toLowerCase());

  return (
    <div>
      <h2>Select Filter</h2>
      <p className="help-text">Choose which issues to display in the sidebar</p>

      <div className="form-group filter-search">
        <input
          type="text"
          placeholder="Search filters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="filter-list">
        {error ? (
          <div className="no-filters">{error}</div>
        ) : (
          <>
            {showDefault && (
              <div
                className={`filter-item default ${selectedFilterId === null ? 'selected' : ''}`}
                onClick={() => onSelectFilter(null)}
              >
                <span className="filter-name">My Issues (Default)</span>
              </div>
            )}
            {filteredFilters.length === 0 && searchTerm !== '' ? (
              <div className="no-filters">No filters match your search</div>
            ) : (
              filteredFilters.map((filter) => (
                <div
                  key={filter.id}
                  className={`filter-item ${selectedFilterId === filter.id ? 'selected' : ''}`}
                  onClick={() => onSelectFilter(filter.id)}
                >
                  <span className="filter-name">{filter.name}</span>
                  {filter.favourite && <span className="filter-fav">★</span>}
                </div>
              ))
            )}
          </>
        )}
      </div>

      <div className="button-row">
        <button type="button" className="btn-primary" onClick={onSave}>
          Save & Close
        </button>
      </div>
    </div>
  );
}

