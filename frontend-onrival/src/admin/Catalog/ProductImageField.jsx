import { useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
  </svg>
);

const SwapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 0 0-15.5-6.2L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 15.5 6.2L21 16" />
    <path d="M21 21v-5h-5" />
  </svg>
);

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

// Campo para subir / cambiar la imagen del producto.
// value: URL o data URL actual ("" si no hay). onChange(nuevaImagen) recibe la data URL.
// TODO: con backend, acá se sube el archivo (multer) y se devuelve la URL que responda la API.
export default function ProductImageField({ value, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const processFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (JPG, PNG, WebP...).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no debe pesar más de 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleInput = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    processFile(file);
  };

  const dragHandlers = {
    onDragOver: (e) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      processFile(e.dataTransfer.files?.[0]);
    },
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="pif">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleInput} style={{ display: "none" }} />

      {value ? (
        <div className={`pif-card ${dragging ? "pif-dragging" : ""}`} {...dragHandlers}>
          <div className="pif-stage">
            <img src={value} alt="Vista previa del producto" />
          </div>
          <div className="pif-bar">
            <span className="pif-hint">
              <InfoIcon />
              JPG, PNG o WebP · máx. 2 MB
            </span>
            <button type="button" className="pif-change" onClick={openPicker}>
              <SwapIcon />
              Cambiar imagen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`pif-drop ${dragging ? "pif-dragging" : ""}`}
          onClick={openPicker}
          {...dragHandlers}
        >
          <span className="pif-drop-icon">
            <UploadIcon />
          </span>
          <strong>Subir imagen</strong>
          <span className="pif-drop-text">Arrastrá una imagen o hacé click para elegirla</span>
          <small>JPG, PNG o WebP · máx. 2 MB</small>
        </button>
      )}

      {error && <p className="pif-error">{error}</p>}
    </div>
  );
}