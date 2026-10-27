import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findCategoryPath } from "./categoryTree";
import "./CategoryCascader.css";

const HOVER_DELAY = 110; // evita que la cascada parpadee al mover el cursor en diagonal
const sameId = (a, b) => String(a) === String(b);

export default function CategoryCascader({ tree, value, onChange, placeholder = "Seleccione categoría..." }) {
  const [open, setOpen] = useState(false);
  const [activePath, setActivePath] = useState([]); // ids abiertos, uno por columna
  const [pos, setPos] = useState({ top: 0, left: 0, maxH: 320 });

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const timerRef = useRef(null);

  const selectedPath = useMemo(() => findCategoryPath(tree, value), [tree, value]);
  const label = selectedPath.map((n) => n.name).join(" › ");

  // Columnas visibles: la raíz y, por cada nodo abierto con hijos, una columna más
  const columns = useMemo(() => {
    const cols = [tree];
    for (const id of activePath) {
      const node = cols[cols.length - 1].find((n) => sameId(n.id, id));
      if (node?.subcategories?.length) cols.push(node.subcategories);
      else break;
    }
    return cols;
  }, [tree, activePath]);

  const openPanel = () => {
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 232)),
      maxH: Math.min(340, Math.max(180, window.innerHeight - rect.bottom - 16)),
    });
    setActivePath(selectedPath.map((n) => n.id)); // abre ya posicionado en lo elegido
    setOpen(true);
  };

  const closePanel = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  // Cerrar: click afuera, Escape, scroll de la página/modal, resize
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      closePanel();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        closePanel();
        triggerRef.current?.focus();
      }
    };
    const onScroll = (e) => {
      if (panelRef.current?.contains(e.target)) return; // scroll interno de una columna
      closePanel();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", closePanel);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", closePanel);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleEnter = (col, node) => {
    clearTimeout(timerRef.current);
    const apply = () => setActivePath((p) => [...p.slice(0, col), node.id]);
    const changing = activePath[col] !== undefined && !sameId(activePath[col], node.id);
    if (changing) timerRef.current = setTimeout(apply, HOVER_DELAY);
    else apply();
  };

  const choose = (id) => {
    onChange(id);
    closePanel();
    triggerRef.current?.focus();
  };

  const handleClick = (col, node) => {
    const hasChildren = node.subcategories?.length > 0;
    const isTouch = window.matchMedia("(hover: none)").matches;

    // En táctil no hay hover: el primer toque abre el siguiente nivel, el segundo elige
    if (isTouch && hasChildren && !sameId(activePath[col], node.id)) {
      setActivePath((p) => [...p.slice(0, col), node.id]);
      return;
    }
    choose(node.id);
  };

  // ← → entre niveles
  const handleItemKeyDown = (e, col, node) => {
    if (e.key === "ArrowRight" && node.subcategories?.length) {
      e.preventDefault();
      setActivePath((p) => [...p.slice(0, col), node.id]);
      requestAnimationFrame(() =>
        panelRef.current?.querySelector(`[data-col="${col + 1}"] button[data-item]`)?.focus()
      );
    }
    if (e.key === "ArrowLeft" && col > 0) {
      e.preventDefault();
      const parentId = activePath[col - 1];
      setActivePath((p) => p.slice(0, col - 1));
      requestAnimationFrame(() =>
        panelRef.current?.querySelector(`[data-col="${col - 1}"] button[data-id="${parentId}"]`)?.focus()
      );
    }
  };

  // ↑ ↓ dentro de una columna
  const handleListKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll("button[data-item]"));
    const i = items.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      openPanel();
      requestAnimationFrame(() => panelRef.current?.querySelector("button[data-item]")?.focus());
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`cascader-trigger ${open ? "cascader-trigger-open" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`cascader-label ${label ? "" : "cascader-placeholder"}`}>{label || placeholder}</span>
        <span className="cascader-caret" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="cascader-panel"
            style={{ top: pos.top, left: pos.left, maxWidth: `calc(100vw - ${pos.left}px - 12px)`, "--cascader-max-h": `${pos.maxH}px` }}
          >
            {columns.map((nodes, col) => (
              <ul key={col} className="cascader-col" data-col={col} onKeyDown={handleListKeyDown}>
                {col === 0 && (
                  <li>
                    <button
                      type="button"
                      data-item
                      className="cascader-item cascader-clear"
                      onClick={() => choose("")}
                    >
                      Sin categoría
                    </button>
                  </li>
                )}

                {nodes.map((node) => {
                  const hasChildren = node.subcategories?.length > 0;
                  const isOpen = sameId(activePath[col] ?? "__none__", node.id);
                  const isSelected = value !== "" && value != null && sameId(value, node.id);

                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        data-item
                        data-id={String(node.id)}
                        className={`cascader-item ${isOpen ? "cascader-item-open" : ""} ${isSelected ? "cascader-item-selected" : ""}`}
                        onMouseEnter={() => handleEnter(col, node)}
                        onMouseLeave={() => clearTimeout(timerRef.current)}
                        onClick={() => handleClick(col, node)}
                        onKeyDown={(e) => handleItemKeyDown(e, col, node)}
                      >
                        <span>{node.name}</span>
                        {hasChildren && <span className="cascader-arrow" aria-hidden="true">›</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}