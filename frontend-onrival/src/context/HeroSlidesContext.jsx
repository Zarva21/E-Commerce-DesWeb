import { createContext, useContext, useState } from "react";
import { HERO_SLIDES } from "../components/Hero/HeroSlides";

const HeroSlidesContext = createContext(null);

export function HeroSlidesProvider({ children }) {
  const [slides, setSlides] = useState(HERO_SLIDES);

  const addSlide = (data) =>
    setSlides((prev) => [...prev, { ...data, id: `slide-${Date.now()}`, active: true }]);

  const updateSlide = (id, data) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));

  const toggleSlide = (id) =>
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));

  const removeSlide = (id) => setSlides((prev) => prev.filter((s) => s.id !== id));

  return (
    <HeroSlidesContext.Provider value={{ slides, addSlide, updateSlide, toggleSlide, removeSlide }}>
      {children}
    </HeroSlidesContext.Provider>
  );
}

export const useHeroSlides = () => {
  const ctx = useContext(HeroSlidesContext);
  if (!ctx) throw new Error("useHeroSlides debe usarse dentro de HeroSlidesProvider");
  return ctx;
};