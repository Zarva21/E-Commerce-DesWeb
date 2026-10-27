import "./PriceRangeSlider.css";

const formatGTQ = (value) => `GTQ${Math.round(value)}`;

export default function PriceRangeSlider({ min, max, valueMin, valueMax, onChange }) {
  const handleMinChange = (e) => {
    const next = Math.min(Number(e.target.value), valueMax - 1);
    onChange(next, valueMax);
  };

  const handleMaxChange = (e) => {
    const next = Math.max(Number(e.target.value), valueMin + 1);
    onChange(valueMin, next);
  };

  const minPercent = ((valueMin - min) / (max - min)) * 100;
  const maxPercent = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="price-slider">
      <div className="price-slider-track">
        <div
          className="price-slider-range"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={valueMin}
        onChange={handleMinChange}
        className="price-slider-input"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={valueMax}
        onChange={handleMaxChange}
        className="price-slider-input"
      />

      <div className="price-slider-labels">
        <span>{formatGTQ(valueMin)}</span>
        <span>{formatGTQ(valueMax)}</span>
      </div>
    </div>
  );
}