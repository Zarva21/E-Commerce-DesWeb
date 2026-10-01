import { useState } from "react";
import "./FilterDropdown.css";

export default function FilterDropdown({ label = "Filtrar", options }) {
  const [open, setOpen] = useState(false);
  if (!options || options.length === 0) return null;

  return (
    <div className="filter-dropdown">
      <button type="button" className="filter-toggle" onClick={() => setOpen((o) => !o)}>
        {label}
        <span className={`filter-arrow ${open ? "filter-arrow-open" : ""}`} />
      </button>
      {open && (
        <ul className="filter-list">
          {options.map((option) => (
            <li key={option}>
              <button type="button" className="filter-option">{option}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}