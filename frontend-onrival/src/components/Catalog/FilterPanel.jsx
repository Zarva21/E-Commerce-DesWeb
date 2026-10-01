import { useEffect, useState } from "react";
import PriceRangeSlider from "./PriceRangeSlider";
import { CATEGORY_OPTIONS, BRAND_OPTIONS, SPORT_OPTIONS, PRICE_RANGE, DEFAULT_FILTERS } from "./filterOptions";
import "./FilterPanel.css";

function ChipGroup({ title, options, selected, onSelect }) {
  return (
    <div className="filter-group">
      <p className="filter-group-title">{title}</p>
      <div className="filter-chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`filter-chip ${selected === option ? "filter-chip-active" : ""}`}
            onClick={() => onSelect(selected === option ? null : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterPanel({ open, value, onClose, onApply }) {
  const [draft, setDraft] = useState(value ?? DEFAULT_FILTERS);

  // cada vez que se abre el panel, arranca desde los filtros que ya están aplicados
  useEffect(() => {
    if (open) setDraft(value ?? DEFAULT_FILTERS);
  }, [open, value]);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => setDraft(DEFAULT_FILTERS);

  return (
    <>
      <div className={`filter-panel-overlay ${open ? "filter-panel-overlay-visible" : ""}`} onClick={onClose} />
      <aside className={`filter-panel ${open ? "filter-panel-open" : ""}`}>
        <div className="filter-panel-head">
          <h2>Filtros</h2>
          <button type="button" className="filter-panel-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="filter-panel-body">
          <ChipGroup
            title="Categoría"
            options={CATEGORY_OPTIONS}
            selected={draft.categoria}
            onSelect={(v) => setDraft((d) => ({ ...d, categoria: v }))}
          />

          <ChipGroup
            title="Marca"
            options={BRAND_OPTIONS}
            selected={draft.marca}
            onSelect={(v) => setDraft((d) => ({ ...d, marca: v }))}
          />

          <div className="filter-group">
            <p className="filter-group-title">Precio</p>
            <PriceRangeSlider
              min={PRICE_RANGE.min}
              max={PRICE_RANGE.max}
              valueMin={draft.priceMin}
              valueMax={draft.priceMax}
              onChange={(priceMin, priceMax) => setDraft((d) => ({ ...d, priceMin, priceMax }))}
            />
          </div>

          <ChipGroup
            title="Deporte"
            options={SPORT_OPTIONS}
            selected={draft.deporte}
            onSelect={(v) => setDraft((d) => ({ ...d, deporte: v }))}
          />

          <div className="filter-group">
            <p className="filter-group-title">Oferta</p>
            <button
              type="button"
              className={`filter-chip ${draft.oferta ? "filter-chip-active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, oferta: !d.oferta }))}
            >
              Solo en oferta
            </button>
          </div>
        </div>

        <div className="filter-panel-footer">
          <button type="button" className="filter-panel-clear" onClick={handleClear}>
            Limpiar
          </button>
          <button type="button" className="filter-panel-apply" onClick={handleApply}>
            <span>Aplicar</span>
          </button>
        </div>
      </aside>
    </>
  );
}