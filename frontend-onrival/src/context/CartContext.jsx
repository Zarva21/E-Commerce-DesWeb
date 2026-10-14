import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "onrival_cart_items";
const CART_ID_KEY = "onrival_cart_id";

export function CartProvider({ children }) {
  // Inicializamos leyendo de localStorage para no perder ítems al recargar
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ID del carrito en PostgreSQL (para sincronizar con /sales/carts)
  const [backendCartId, setBackendCartId] = useState(() => {
    return localStorage.getItem(CART_ID_KEY) || null;
  });

  // Guardamos cambios en localStorage cada vez que varía items
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Guardamos el cartId del backend si cambia
  useEffect(() => {
    if (backendCartId) {
      localStorage.setItem(CART_ID_KEY, backendCartId);
    } else {
      localStorage.removeItem(CART_ID_KEY);
    }
  }, [backendCartId]);

  const addItem = (product, size, quantity = 1) => {
    const cartId = `${product.id}-${size}`;
    const maxStock = product.stock_available ?? 99;

    setItems((prev) => {
      const existing = prev.find((it) => it.cartId === cartId);
      if (existing) {
        const nextQty = Math.min(
          existing.quantity + quantity,
          existing.stock_available ?? maxStock
        );
        return prev.map((it) =>
          it.cartId === cartId ? { ...it, quantity: nextQty } : it
        );
      }

      return [
        ...prev,
        {
          cartId,
          id: product.id,
          product_variant_id: product.product_variant_id,
          stock_available: maxStock,
          image: product.image,
          brand: product.brand,
          name: product.name,
          gender: product.gender,
          price: product.price,
          size,
          quantity: Math.min(quantity, maxStock),
        },
      ];
    });
  };

  const increase = (cartId) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.cartId !== cartId) return it;
        const maxStock = it.stock_available ?? 99;
        return { ...it, quantity: Math.min(maxStock, it.quantity + 1) };
      })
    );
  };

  const decrease = (cartId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.cartId === cartId
          ? { ...it, quantity: Math.max(1, it.quantity - 1) }
          : it
      )
    );
  };

  const remove = (cartId) => {
    setItems((prev) => prev.filter((it) => it.cartId !== cartId));
  };

  const clearCart = () => {
    setItems([]);
    setBackendCartId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CART_ID_KEY);
  };

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const count = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        increase,
        decrease,
        remove,
        clearCart,
        subtotal,
        count,
        backendCartId,
        setBackendCartId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart tiene que usarse dentro de <CartProvider>");
  return ctx;
}