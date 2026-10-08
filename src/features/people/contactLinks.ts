/*
 * Links that open the phone's own apps. The person's number or address goes only into the link, never anywhere else.
 */

const digitsOf = (phone: string) => phone.replace(/\D/g, "");

/** A number as the dialler wants it: digits, with a leading "+" kept. */
export function callUrl(phone: string): string | null {
  const digits = digitsOf(phone);
  return digits ? `tel:${phone.trim().startsWith("+") ? "+" : ""}${digits}` : null;
}

/** WhatsApp wants the number with its country code and nothing else; a leading "00" means the same as "+". */
export function whatsappUrl(phone: string): string | null {
  const digits = digitsOf(phone).replace(/^00/, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function mailUrl(email: string): string | null {
  const address = email.trim();
  return /^[^\s@]+@[^\s@]+$/.test(address) ? `mailto:${address}` : null;
}
