import { useState } from "react";
import { HERO_SLIDES } from "./heroSlides";
import "./HeroCarousel.css";

export default function HeroCarousel({ onSelectProduct }) {
  const [index, setIndex] = useState(0);
  const total = HERO_SLIDES.length;
  const slide = HERO_SLIDES[index];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <section className="hero-carousel">
      <div className="hero-slide">
        <img src={slide.image} alt={slide.title} className="hero-image" />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-content">
          <p className="hero-eyebrow">{slide.eyebrow}</p>
          <h1 className="hero-title">{slide.title}</h1>
          {slide.ctaLabel && (
            <button
              type="button"
              className="hero-cta"
              onClick={() => slide.productId && onSelectProduct?.(slide.productId)}
            >
              {slide.ctaLabel}
            </button>
          )}
        </div>

        <button
          type="button"
          className="hero-arrow hero-arrow-left"
          onClick={goPrev}
          aria-label="Anuncio anterior"
        >
          ‹
        </button>
        <button
          type="button"
          className="hero-arrow hero-arrow-right"
          onClick={goNext}
          aria-label="Siguiente anuncio"
        >
          ›
        </button>

        <div className="hero-dots">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`hero-dot ${i === index ? "hero-dot-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Ir al anuncio ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}