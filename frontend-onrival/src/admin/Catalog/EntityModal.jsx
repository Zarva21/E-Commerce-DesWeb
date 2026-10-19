import { useState } from "react";

// Pop up para crear / editar una marca, categoría o proveedor.
// fields: [{ name, label, type?, required?, placeholder?, options? }]
//   type: "text" (por defecto) | "email" | "tel" | "textarea" | "select" (con options: [{ value, label }])
// onSave(form) devuelve { ok } o { error }; si hay error se muestra y el pop up sigue abierto.
export default function EntityModal({ title, fields, initial, submitLabel = "Guardar", onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  };

  const submit = (e) => {
    e.preventDefault();
    const res = onSave(form);
    if (res?.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="catalog-modal-overlay" onClick={onClose}>
      <div className="catalog-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="catalog-modal-header">
          <h2>{title}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="catalog-error">{error}</div>}

        <form onSubmit={submit} className="catalog-form">
          {fields.map((f) => (
            <div className="form-group" key={f.name}>
              <label>{f.label}</label>

              {f.type === "textarea" ? (
                <textarea
                  rows="3"
                  placeholder={f.placeholder}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                />
              ) : f.type === "select" ? (
                <select
                  required={f.required}
                  value={String(form[f.name] ?? "")}
                  onChange={(e) => setField(f.name, e.target.value)}
                >
                  {f.options.map((o) => (
                    <option key={String(o.value)} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  required={f.required}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                />
              )}
            </div>
          ))}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}