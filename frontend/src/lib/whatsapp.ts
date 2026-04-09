export const BUSINESS_WHATSAPP_NUMBER = String(import.meta.env.VITE_WHATSAPP_NUMBER || "11953784550").trim();

function digitsOnly(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function normalizeWhatsAppPhone(phone?: string) {
  const digits = digitsOnly(phone || "");
  if (!digits) return "";

  // Auto-prefix Brazil country code for local numbers without DDI.
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function buildWhatsAppUrl(message: string, phone?: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);

  if (normalizedPhone) {
    return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}

export function openWhatsAppMessage(message: string, phone?: string) {
  const url = buildWhatsAppUrl(message, phone);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return !!opened;
}
