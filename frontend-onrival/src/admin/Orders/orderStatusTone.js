export function orderStatusTone(status) {
  switch (status) {
    case "paid":
    case "Pagado":
      return "info";
    case "shipped":
    case "Enviado":
      return "primary";
    case "delivered":
    case "Entregado":
      return "success";
    case "pending_payment":
    case "Pendiente":
      return "warning";
    case "cancelled":
    case "Cancelado":
      return "danger";
    default:
      return "muted";
  }
}

export function orderStatusLabel(status) {
  const map = {
    pending_payment: "Pendiente Pago",
    paid: "Pagado / En Preparación",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };
  return map[status] || status;
}