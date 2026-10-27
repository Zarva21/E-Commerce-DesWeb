import "./Logo.css";

export default function Logo({ variant }) {
  return (
    <div className="logo">
      <span className="logo-mark" aria-hidden="true">
        <span className="logo-bar logo-bar-1" />
        <span className="logo-bar logo-bar-2" />
        <span className="logo-bar logo-bar-3" />
      </span>
      <span className="logo-text">
        <span className="logo-strong">ON</span>
        <span className="logo-light">RIVAL</span>
      </span>
      {variant === "admin" && <span className="logo-tag">Admin</span>}
    </div>
  );
}