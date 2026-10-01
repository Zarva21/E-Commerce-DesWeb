import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { findProductById } from "../Catalog/mockProducts";
import SizeSelector from "./SizeSelector";
import { getSizeOptions } from "./sizeOptions";
import "./ProductDetail.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 2 }).format(value);

export default function ProductDetail({ productId, onBack, onGoToCart }) {
  const product = findProductById(productId);
  const { addItem } = useCart();
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <section className="product-detail">
        <button type="button" className="product-detail-back" onClick={onBack}>‹ Volver</button>
        <p>No encontramos este producto.</p>
      </section>
    );
  }

  const sizes = getSizeOptions(product);
  const needsSize = sizes.length > 0;

  const handleAddToCart = () => {
    if (needsSize && !size) return;

    // Se agrega el producto directamente sin validar sesión
    addItem(product, size ?? "Única", 1);
    setAdded(true);
  };

  const handleSelectSize = (value) => { setSize(value); setAdded(false); };

  return (
    <section className="product-detail">
      <button type="button" className="product-detail-back" onClick={onBack}>‹ Volver</button>
      <div className="product-detail-layout">
        <div className="product-detail-image"><img src={product.image} alt={product.name} /></div>

        <div className="product-detail-info">
          <p className="product-detail-brand">{product.brand}</p>
          <h1 className="product-detail-name">{product.name}</h1>
          <p className="product-detail-gender">{product.gender}</p>
          <p className="product-detail-price">{formatPrice(product.price)}</p>
          {product.description && <p className="product-detail-description">{product.description}</p>}

          <div className="product-detail-divider" aria-hidden="true" />

          {needsSize && (
            <div className="product-detail-sizes">
              <p className="product-detail-sizes-label">Talla (US)</p>
              <SizeSelector sizes={sizes} selected={size} onSelect={handleSelectSize} />
              {!size && <p className="product-detail-size-hint">Elegí una talla para continuar</p>}
            </div>
          )}

          <button
            type="button"
            className="product-detail-add"
            onClick={handleAddToCart}
            disabled={needsSize && !size}
          >
            {added ? "Agregado ✓" : "Añadir al carrito"}
          </button>

          {added && <button type="button" className="product-detail-go-cart" onClick={onGoToCart}>Ver carrito →</button>}
        </div>
      </div>
    </section>
  );
}