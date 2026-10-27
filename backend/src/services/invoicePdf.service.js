// src/services/invoicePdf.service.js
const PDFDocument = require("pdfkit");

/**
 * Genera el binario en Buffer del PDF de la factura
 */
exports.generateInvoicePdfBuffer = (order, invoice, items = [], customerName = "Cliente") => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // --- ENCABEZADO ---
    doc.fontSize(20).font("Helvetica-Bold").text("ONRIVAL STORE", 40, 40);
    doc.fontSize(9).font("Helvetica").text("Equipamiento y Calzado Deportivo", 40, 65);
    doc.text("Guatemala, C.A. | soporte@onrival.store", 40, 78);

    doc.fontSize(16).font("Helvetica-Bold").text("FACTURA DE COMPRA", 350, 40, { align: "right", width: 200 });
    doc.fontSize(9).font("Helvetica")
      .text(`Factura No: ${invoice.invoice_number}`, 350, 62, { align: "right", width: 200 })
      .text(`Orden No: ${order.order_number}`, 350, 75, { align: "right", width: 200 })
      .text(`Fecha: ${new Date().toLocaleDateString("es-GT")}`, 350, 88, { align: "right", width: 200 });

    doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, 110).lineTo(550, 110).stroke();

    // --- DATOS DEL CLIENTE ---
    doc.fontSize(10).font("Helvetica-Bold").text("DATOS DEL CLIENTE", 40, 125);
    doc.fontSize(9).font("Helvetica")
      .text(`Nombre: ${customerName}`, 40, 140)
      .text(`Estado del Pago: ${order.status === "paid" ? "PAGADO" : "PENDIENTE (CONTRA ENTREGA)"}`, 40, 155);

    doc.strokeColor("#eeeeee").lineWidth(1).moveTo(40, 175).lineTo(550, 175).stroke();

    // --- TABLA DE ARTÍCULOS ---
    let yPosition = 190;
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Descripción / Producto", 40, yPosition);
    doc.text("Variante (Talla / Color)", 260, yPosition);
    doc.text("Cant.", 390, yPosition, { align: "center", width: 35 });
    doc.text("Precio Unit.", 430, yPosition, { align: "right", width: 55 });
    doc.text("Subtotal", 490, yPosition, { align: "right", width: 60 });

    yPosition += 15;
    doc.strokeColor("#cccccc").lineWidth(0.5).moveTo(40, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 8;

    doc.font("Helvetica").fontSize(9);

    items.forEach((item) => {
      const lineTotal = Number(item.price * item.quantity).toFixed(2);
      
      // Armar la descripción de la variante
      const variantDetails = [
        item.size && item.size !== "Única" ? `Talla: ${item.size}` : (item.size || "Única"),
        item.color ? `Color: ${item.color}` : null
      ].filter(Boolean).join(" · ");

      doc.text(item.name || "Producto", 40, yPosition, { width: 215 });
      doc.text(variantDetails || "Estándar", 260, yPosition, { width: 125 });
      doc.text(String(item.quantity), 390, yPosition, { align: "center", width: 35 });
      doc.text(`Q ${Number(item.price).toFixed(2)}`, 430, yPosition, { align: "right", width: 55 });
      doc.text(`Q ${lineTotal}`, 490, yPosition, { align: "right", width: 60 });

      yPosition += 22;
    });

    doc.strokeColor("#cccccc").lineWidth(1).moveTo(40, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 12;

    // --- BLOQUE DE TOTALES ---
    const rightColX = 350;
    const rightColWidth = 200;

    doc.fontSize(9).font("Helvetica");
    
    // Subtotal
    doc.text(`Subtotal productos:`, rightColX, yPosition, { width: 110, align: "right" });
    doc.text(`Q ${Number(order.subtotal).toFixed(2)}`, rightColX + 115, yPosition, { width: 85, align: "right" });
    yPosition += 15;

    // Descuento (si hubo)
    if (Number(order.discount) > 0) {
      doc.text(`Descuento aplicado:`, rightColX, yPosition, { width: 110, align: "right" });
      doc.text(`-Q ${Number(order.discount).toFixed(2)}`, rightColX + 115, yPosition, { width: 85, align: "right" });
      yPosition += 15;
    }

    // Costo de Envío
    doc.text(`Costo de envío:`, rightColX, yPosition, { width: 110, align: "right" });
    doc.text(`Q ${Number(order.shipping_cost || 0).toFixed(2)}`, rightColX + 115, yPosition, { width: 85, align: "right" });
    yPosition += 15;

    // Impuestos (IVA 12%)
    doc.text(`Impuestos (IVA 12%):`, rightColX, yPosition, { width: 110, align: "right" });
    doc.text(`Q ${Number(order.tax || 0).toFixed(2)}`, rightColX + 115, yPosition, { width: 85, align: "right" });
    yPosition += 18;

    // Línea separadora previa al total
    doc.strokeColor("#000000").lineWidth(0.8).moveTo(rightColX + 40, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 6;

    // Total general
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text(`Total liquidado:`, rightColX, yPosition, { width: 110, align: "right" });
    doc.text(`Q ${Number(order.total).toFixed(2)}`, rightColX + 115, yPosition, { width: 85, align: "right" });

    // Pie de página
    doc.font("Helvetica").fontSize(8).fillColor("#666666")
      .text("Gracias por elegir OnRival Store. Este documento es un comprobante digital oficial de compra.", 40, 760, { align: "center", width: 510 });

    doc.end();
  });
};