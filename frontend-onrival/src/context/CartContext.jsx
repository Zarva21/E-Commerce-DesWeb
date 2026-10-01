import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = (product, size, quantity = 1) => {
    const cartId = `${product.id}-${size}`;
    setItems((prev) => {
      const existing = prev.find((it) => it.cartId === cartId);
      if (existing) {
        return prev.map((it) => (it.cartId === cartId ? { ...it, quantity: it.quantity + quantity } : it));
      }
      return [...prev, { cartId, id: product.id, image: product.image, brand: product.brand, name: product.name, gender: product.gender, price: product.price, size, quantity }];
    });
  };

  const increase = (cartId) => setItems((prev) => prev.map((it) => (it.cartId === cartId ? { ...it, quantity: it.quantity + 1 } : it)));
  const decrease = (cartId) => setItems((prev) => prev.map((it) => (it.cartId === cartId ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)));
  const remove = (cartId) => setItems((prev) => prev.filter((it) => it.cartId !== cartId));
  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const count = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, increase, decrease, remove, clearCart, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart tiene que usarse dentro de <CartProvider>");
  return ctx;
}