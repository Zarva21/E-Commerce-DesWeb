import "./StatusBadge.css";

// tone: "success" | "warning" | "danger" | "neutral"
export default function StatusBadge({ label, tone = "neutral" }) {
  return <span className={`status-badge status-badge-${tone}`}>{label}</span>;
}