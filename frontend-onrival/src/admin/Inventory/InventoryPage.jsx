import PageHeader from "../ui/PageHeader";
import StatusBadge from "../ui/StatusBadge";
import { MOCK_INVENTORY } from "./mockInventory";
import "../ui/DataTable.css";

const formatPrice = (value) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
  }).format(value);

function stockBadge(stock) {
  if (stock === 0) return <StatusBadge label="Agotado" tone="danger" />;
  if (stock <= 5) return <StatusBadge label="Stock bajo" tone="warning" />;
  return <StatusBadge label="Disponible" tone="success" />;
}

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Productos cargados en la tienda"
        actionLabel="Agregar producto"
        onAction={() => {
          // TODO: abrir formulario de nuevo producto
          console.log("agregar producto");
        }}
      />

      <div className="data-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th>Género</th>
              <th>Precio</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {MOCK_INVENTORY.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="data-cell-main">
                    <div className="data-cell-thumb">
                      <img src={product.image} alt={product.name} />
                    </div>
                    <span className="data-cell-title">{product.name}</span>
                  </div>
                </td>
                <td>{product.brand}</td>
                <td>{product.category}</td>
                <td>{product.gender}</td>
                <td>{formatPrice(product.price)}</td>
                <td>
                  {product.stock} · {stockBadge(product.stock)}
                </td>
                <td>
                  <div className="data-actions">
                    <button type="button" className="data-action-btn">Editar</button>
                    <button type="button" className="data-action-btn data-action-btn-danger">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {MOCK_INVENTORY.length === 0 && (
          <p className="data-empty">Todavía no hay productos cargados.</p>
        )}
      </div>
    </div>
  );
}