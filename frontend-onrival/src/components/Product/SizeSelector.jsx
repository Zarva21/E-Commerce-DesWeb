import "./SizeSelector.css";

export default function SizeSelector({ sizes, selected, onSelect }) {
  return (
    <div className="size-selector">
      {sizes.map((size) => (
        <button key={size} type="button" className={`size-option ${selected === size ? "size-option-active" : ""}`} onClick={() => onSelect(size)}>
          {size}
        </button>
      ))}
    </div>
  );
}