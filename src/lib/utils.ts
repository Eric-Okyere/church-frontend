export function formatDate(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// GraceTrack assumes Ghanaian phone numbers by default — a leading "0"
// local format and the +233 country code — since that's this platform's
// primary market today. If a church's members use a different country's
// numbers, the WhatsApp link built below will come out wrong; swap in a
// per-church country-code setting if/when that need comes up.
const DEFAULT_COUNTRY_CODE = "233";

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0")
    ? DEFAULT_COUNTRY_CODE + digits.slice(1)
    : digits.startsWith(DEFAULT_COUNTRY_CODE)
      ? digits
      : DEFAULT_COUNTRY_CODE + digits;
  const base = `https://wa.me/${international}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
