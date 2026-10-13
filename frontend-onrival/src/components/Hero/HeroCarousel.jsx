import { useState } from "react";
import { useHeroSlides } from "../../context/HeroSlidesContext";
import "./HeroCarousel.css";

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 5 8 12 15 19" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 5 16 12 9 19" />
  </svg>
);

export default function HeroCarousel({ onAction }) {
  const { slides: allSlides } = useHeroSlides();
  const slides = allSlides.filter((s) => s.active);
  const [index, setIndex] = useState(0);
  const total = slides.length;

  if (total === 0) return null;

  const current = index >= total ? 0 : index; // por si se ocultó/eliminó el último slide
  const slide = slides[current];

  const goPrev = () => setIndex((current - 1 + total) % total);
  const goNext = () => setIndex((current + 1) % total);

  return (
    <section className="hero-carousel">
      <div className="hero-slide">
        <img src={slide.image} alt={slide.title} className="hero-image" />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-content">
          <p className="hero-eyebrow">{slide.eyebrow}</p>
          <h1 className="hero-title">{slide.title}</h1>
          {slide.ctaLabel && slide.link?.type !== "none" && (
            <button type="button" className="hero-cta" onClick={() => onAction?.(slide.link)}>
              {slide.ctaLabel}
            </button>
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className="hero-arrow hero-arrow-left"
              onClick={goPrev}
              aria-label="Anuncio anterior"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="hero-arrow hero-arrow-right"
              onClick={goNext}
              aria-label="Siguiente anuncio"
            >
              <ChevronRight />
            </button>

            <div className="hero-dots">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`hero-dot ${i === current ? "hero-dot-active" : ""}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Ir al anuncio ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}