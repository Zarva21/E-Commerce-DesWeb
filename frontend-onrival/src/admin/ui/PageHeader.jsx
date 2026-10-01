import "./PageHeader.css";

export default function PageHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-header-title">{title}</h2>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>

      {actionLabel && (
        <button type="button" className="page-header-action" onClick={onAction}>
          + {actionLabel}
        </button>
      )}
    </div>
  );
}