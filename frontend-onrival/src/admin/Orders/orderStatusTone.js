export function orderStatusTone(status) {
  switch (status) {
    case "Entregado":
      return "success";
    case "Enviado":
      return "neutral";
    case "Cancelado":
      return "danger";
    default:
      return "warning"; // Pendiente
  }
}