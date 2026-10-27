import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { HeroSlidesProvider } from "./context/HeroSlidesContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <CartProvider>
        <HeroSlidesProvider>
          <App />
        </HeroSlidesProvider>
      </CartProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);