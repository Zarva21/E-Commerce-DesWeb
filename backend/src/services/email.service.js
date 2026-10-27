const { Resend } = require("resend");
const { generateInvoicePdfBuffer } = require("./invoicePdf.service");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "OnRival <soporte@onrival.store>";

// 1. Recuperar Contraseña
exports.sendPasswordReset = async ({ email, token }) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Restablece tu contraseña - OnRival",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer el acceso a tu cuenta en OnRival.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Restablecer Contraseña
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">Este enlace expirará en 15 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje con seguridad.</p>
      </div>
    `,
  });
};

// 2. Código 2FA / OTP
exports.send2FACode = async ({ email, code }) => {
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Tu código de verificación: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
        <h2 style="color: #0f172a;">Código de Seguridad</h2>
        <p>Usa el siguiente código de 6 dígitos para validar tu inicio de sesión:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #2563eb; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 13px;">Válido durante 5 minutos. No compartas este código con nadie.</p>
      </div>
    `,
  });
};

// 3. Confirmación de Compra y Factura
exports.sendOrderConfirmation = async ({ email, customerName, order, invoice, items = [] }) => {
  // 1. Generar el PDF en memoria
  const pdfBuffer = await generateInvoicePdfBuffer(order, invoice, items, customerName);

  // 2. Enviar con Resend adjuntando el buffer
  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Factura y Confirmación de Pedido #${order.order_number}`,
    html: `
      <div style="font-family: sans-serif; max-width: 550px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">¡Gracias por tu compra, ${customerName}!</h2>
        <p>Tu orden <strong>#${order.order_number}</strong> ha sido registrada exitosamente.</p>
        <p>Adjunto a este correo encontrarás tu factura en formato PDF (<strong>${invoice.invoice_number}.pdf</strong>) con el desglose oficial de tu compra.</p>
        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Total Pagado/Facturado:</strong> Q ${Number(order.total).toFixed(2)}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">Si tienes alguna duda con tu pedido, manda un correo a soporte@onrival.store con tu número de orden.</p>
      </div>
    `,
    attachments: [
      {
        filename: `Factura-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
};

// 4. Notificación de Cambio de Estado
exports.sendOrderStatusUpdate = async ({ email, orderNumber, newStatus }) => {
  const statusTranslations = {
    paid: "Pagado y en preparación en bodega",
    shipped: "En camino a tu dirección",
    delivered: "Entregado con éxito",
    cancelled: "Cancelado",
  };

  const text = statusTranslations[newStatus] || newStatus;

  return resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Actualización de tu pedido #${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Actualización de envío</h2>
        <p>Tu orden <strong>#${orderNumber}</strong> ha cambiado de estado:</p>
        <div style="background: #eff6ff; color: #1d4ed8; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 16px 0;">
          ${text}
        </div>
        <p style="color: #64748b; font-size: 13px;">Puedes ver el estado en tiempo real iniciando sesión en tu perfil.</p>
      </div>
    `,
  });
};

