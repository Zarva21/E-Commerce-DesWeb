import { useState, useEffect } from "react";
import api from "../../config/api";
import { useCart } from "../../context/CartContext";
import { SHIPPING_COST } from "./shippingCost";
import "./ShippingPage.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

export default function ShippingPage({ onBackToCart, onContinue }) {
  const { items, subtotal } = useCart();
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("new"); // "new" o ID numérico
  const [isLogged, setIsLogged] = useState(false);

  // Sección 1: Datos de Contacto
  const [contact, setContact] = useState({
    nombre: "",
    email: "",
    telefono: "",
  });

  // Sección 2: Datos de Dirección (para nueva dirección o ghost user)
  const [addressForm, setAddressForm] = useState({
    direccion: "",
    direccion2: "",
    ciudad: "Guatemala",
    departamento: "Guatemala",
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("accessToken");

    if (token && storedUser.email) {
      setIsLogged(true);
      const fullName = [storedUser.firstName, storedUser.lastName].filter(Boolean).join(" ");

      setContact({
        nombre: fullName || storedUser.email.split("@")[0],
        email: storedUser.email,
        telefono: storedUser.phone || "",
      });

      // Cargar direcciones guardadas del cliente
      api.get("/users/customers/addresses/me")
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setSavedAddresses(res.data);
            const defaultAddr = res.data.find((a) => a.is_default) || res.data[0];
            setSelectedAddressId(defaultAddr.id);
          } else {
            setSavedAddresses([]);
            setSelectedAddressId("new");
          }
        })
        .catch((err) => {
          console.warn("No se pudieron cargar las direcciones guardadas:", err);
          setSavedAddresses([]);
          setSelectedAddressId("new"); 
        });
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalShippingData = {
      nombre: contact.nombre,
      email: contact.email,
      telefono: contact.telefono,
    };

    // 1. Buscamos la dirección seleccionada si no es "new"
    const chosen = (isLogged && selectedAddressId !== "new")
      ? savedAddresses.find((a) => a.id === Number(selectedAddressId))
      : null;

    if (chosen) {
      //El usuario eligió una dirección válida de la BD
      finalShippingData = {
        ...finalShippingData,
        address_id: chosen.id,
        direccion: chosen.address_line1,
        direccion2: chosen.address_line2 || "",
        ciudad: chosen.city,
        departamento: chosen.state || "Guatemala",
      };
    } else {
      //Si eligió "new", o si la lista estaba vacía/falló la consulta
      finalShippingData = {
        ...finalShippingData,
        address_id: null,
        direccion: addressForm.direccion,
        direccion2: addressForm.direccion2,
        ciudad: addressForm.ciudad,
        departamento: addressForm.departamento,
      };
    }

    onContinue(finalShippingData);
  };

  const total = subtotal + SHIPPING_COST;

  return (
    <section className="shipping-page">
      <button type="button" className="shipping-back" onClick={onBackToCart}>
        ‹ Volver al carrito
      </button>

      <div className="shipping-head">
        <p className="shipping-eyebrow">Checkout</p>
        <h1>DATOS DE ENVÍO</h1>
      </div>

      <div className="shipping-layout">
        <form className="shipping-form" onSubmit={handleSubmit}>
          
          {/* SECCIÓN 1: CONTACTO */}
          <div className="form-section">
            <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>1. Información de Contacto</h3>
            <label className="shipping-field">
              <span>Nombre completo</span>
              <input
                type="text"
                value={contact.nombre}
                onChange={(e) => setContact({ ...contact, nombre: e.target.value })}
                required
              />
            </label>
            <div className="shipping-field-row">
              <label className="shipping-field">
                <span>Correo electrónico</span>
                <input
                  type="email"
                  value={contact.email}
                  disabled={isLogged} // Si está logueado, su correo no cambia
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  required
                />
              </label>
              <label className="shipping-field">
                <span>Teléfono</span>
                <input
                  type="tel"
                  value={contact.telefono}
                  onChange={(e) => setContact({ ...contact, telefono: e.target.value })}
                  placeholder="0000-0000"
                  required
                />
              </label>
            </div>
          </div>

          <hr style={{ margin: "1.5rem 0", borderColor: "#e2e8f0" }} />

          {/* SECCIÓN 2: DIRECCIÓN */}
          <div className="form-section">
            <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>2. Dirección de Entrega</h3>

            {/* Selector de direcciones si tiene guardadas */}
            {isLogged && savedAddresses.length > 0 && (
              <div style={{ marginBottom: "1.2rem" }}>
                <label className="shipping-field">
                  <span>Seleccionar dirección guardada</span>
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    style={{ padding: "0.75rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  >
                    {savedAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address_line1}, {addr.city} {addr.is_default ? "(Predeterminada)" : ""}
                      </option>
                    ))}
                    <option value="new">+ Usar una dirección diferente</option>
                  </select>
                </label>
              </div>
            )}

            {/* Formulario de dirección manual: Visible si es Ghost O si eligió "new" */}
            {(!isLogged || selectedAddressId === "new") && (
              <>
                <label className="shipping-field">
                  <span>Dirección (Calle, avenida, zona)</span>
                  <input
                    type="text"
                    value={addressForm.direccion}
                    onChange={(e) => setAddressForm({ ...addressForm, direccion: e.target.value })}
                    placeholder="Ej. 5ta Avenida 12-34 Zona 10"
                    required
                  />
                </label>
                <label className="shipping-field">
                  <span>Apto / Oficina / Referencia (Opcional)</span>
                  <input
                    type="text"
                    value={addressForm.direccion2}
                    onChange={(e) => setAddressForm({ ...addressForm, direccion2: e.target.value })}
                  />
                </label>
                <div className="shipping-field-row">
                  <label className="shipping-field">
                    <span>Municipio / Ciudad</span>
                    <input
                      type="text"
                      value={addressForm.ciudad}
                      onChange={(e) => setAddressForm({ ...addressForm, ciudad: e.target.value })}
                      required
                    />
                  </label>
                  <label className="shipping-field">
                    <span>Departamento</span>
                    <input
                      type="text"
                      value={addressForm.departamento}
                      onChange={(e) => setAddressForm({ ...addressForm, departamento: e.target.value })}
                      required
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <button type="submit" className="shipping-submit" style={{ marginTop: "1.5rem" }}>
            <span>Continuar al Pago</span>
          </button>
        </form>

        <aside className="shipping-summary">
          <h2>TU PEDIDO</h2>
          <ul className="shipping-summary-list">
            {items.map((it) => (
              <li key={it.cartId}>
                <span>{it.name} · {it.size} x{it.quantity}</span>
                <span>{formatPrice(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="shipping-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="shipping-summary-row">
            <span>Envío</span>
            <span>{formatPrice(SHIPPING_COST)}</span>
          </div>
          <div className="shipping-summary-row shipping-summary-total">
            <span>TOTAL</span>
            <span>{formatPrice(total)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}