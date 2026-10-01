import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_OFFERS } from "./mockOffers";
import "../ui/DataTable.css";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("es-GT", { day: "2-digit", month: "short" });

export default function OffersPage() {
  // TODO: esto se reemplaza cuando las ofertas vengan/actualicen contra la API
  const [offers, setOffers] = useState(MOCK_OFFERS);

  const toggleActive = (id) => {
    setOffers((prev) =>
      prev.map((offer) => (offer.id === id ? { ...offer, active: !offer.active } : offer))
    );
  };

  return (
    <div>
      <PageHeader
        title="Ofertas"
        subtitle="Descuentos y promociones activas en la tienda"
        actionLabel="Agregar oferta"
        onAction={() => {
          // TODO: abrir formulario de nueva oferta
          console.log("agregar oferta");
        }}
      />

      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Oferta</th>
              <th>Descuento</th>
              <th>Aplica a</th>
              <th>Vigencia</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td className="data-cell-title">{offer.name}</td>
                <td>{offer.discount}%</td>
                <td>{offer.appliesTo}</td>
                <td className="data-cell-muted">
                  {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
                </td>
                <td>
                  <StatusBadge
                    label={offer.active ? "Activa" : "Inactiva"}
                    tone={offer.active ? "success" : "neutral"}
                  />
                </td>
                <td>
                  <div className="data-actions">
                    <button type="button" className="data-action-btn">Editar</button>
                    <button
                      type="button"
                      className="data-action-btn"
                      onClick={() => toggleActive(offer.id)}
                    >
                      {offer.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {offers.length === 0 && <p className="data-empty">Todavía no hay ofertas.</p>}
      </div>
    </div>
  );
}