import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { HeroSlidesProvider } from "./context/HeroSlidesContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CartProvider>
      <HeroSlidesProvider>
        <App />
      </HeroSlidesProvider>
    </CartProvider>
  </React.StrictMode>
);