import { useEffect, useState } from "react";
import { useCart } from "../../context/CartContext";
import { catalogService } from "../../services/catalogService";
import SizeSelector from "./SizeSelector";
import "./ProductDetail.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

export default function ProductDetail({ productId, onBack, onGoToCart }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    catalogService
      .getById(productId)
      .then((data) => {
        setProduct(data);
        setAdded(false);

        // Preselecciona la primera variante con existencias si existen variantes
        const vars = data.variants || [];
        if (vars.length > 0) {
          const firstAvailable =
            vars.find((v) => (v.stock?.quantity_on_hand ?? v.stock?.quantity ?? 0) > 0) ||
            vars[0];
          setSize(firstAvailable.size);
        } else {
          setSize(null);
        }
      })
      .catch((err) => {
        console.error("Error al obtener detalle del producto:", err);
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <section className="product-detail">
        <button type="button" className="product-detail-back" onClick={onBack}>
          ‹ Volver
        </button>
        <p>Cargando información del producto...</p>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="product-detail">
        <button type="button" className="product-detail-back" onClick={onBack}>
          ‹ Volver
        </button>
        <p>No encontramos este producto.</p>
      </section>
    );
  }

  const variants = product.variants || [];
  const sizes = variants.filter((v) => v.size).map((v) => v.size);
  const needsSize = sizes.length > 0;

  // Busca la variante activa por talla seleccionada
  const selectedVariant = needsSize
    ? variants.find((v) => String(v.size) === String(size))
    : variants[0] || null;

  // Extrae el stock asegurando quantity_on_hand
  const currentVariantStock =
    selectedVariant?.stock?.quantity_on_hand ??
    selectedVariant?.stock?.quantity ??
    product.stock ??
    0;

  const isOutOfStock = needsSize
    ? !size || currentVariantStock <= 0
    : currentVariantStock <= 0;

  const handleAddToCart = () => {
    if (needsSize && !size) return;
    if (currentVariantStock <= 0) return;

    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        product_variant_id: selectedVariant?.id,
        stock_available: currentVariantStock,
      },
      size ?? "Única",
      1
    );
    setAdded(true);
  };

  const handleSelectSize = (value) => {
    setSize(value);
    setAdded(false);
  };

  return (
    <section className="product-detail">
      <button type="button" className="product-detail-back" onClick={onBack}>
        ‹ Volver
      </button>

      <div className="product-detail-layout">
        <div className="product-detail-image">
          <img src={product.image} alt={product.name} />
        </div>

        <div className="product-detail-info">
          <p className="product-detail-brand">{product.brand}</p>
          <h1 className="product-detail-name">{product.name}</h1>
          <p className="product-detail-gender">{product.gender}</p>
          <p className="product-detail-price">{formatPrice(product.price)}</p>
          {product.description && (
            <p className="product-detail-description">{product.description}</p>
          )}

          <div className="product-detail-divider" aria-hidden="true" />

          {needsSize && (
            <div className="product-detail-sizes">
              <p className="product-detail-sizes-label">Talla</p>
              <SizeSelector sizes={sizes} selected={size} onSelect={handleSelectSize} />
              {!size && <p className="product-detail-size-hint">Elegí una talla para continuar</p>}
              {size && currentVariantStock <= 0 && (
                <p className="product-detail-size-hint" style={{ color: "var(--danger, #dc2626)" }}>
                  Esta talla se encuentra agotada
                </p>
              )}
            </div>
          )}

          <div style={{ margin: "0.75rem 0", fontSize: "0.9rem", color: currentVariantStock > 0 ? "#16a34a" : "#dc2626" }}>
            {currentVariantStock > 0
              ? `● ${currentVariantStock} unidades disponibles`
              : "● Sin existencias en esta talla"}
          </div>

          <button
            type="button"
            className="product-detail-add"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {added
              ? "Agregado ✓"
              : isOutOfStock
              ? "Sin existencias"
              : "Añadir al carrito"}
          </button>

          {added && (
            <button type="button" className="product-detail-go-cart" onClick={onGoToCart}>
              Ver carrito →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}