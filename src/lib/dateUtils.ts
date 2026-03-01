/**
 * Date utilities — shared helpers for date formatting.
 *
 * Single responsibility: provide pure date-formatting functions used
 * across task modals and other components.
 */

/**
 * Returns the current local time as a `datetime-local` input value string
 * (e.g. `"2026-03-01T14:30"`).
 */
export function getMinDateTimeLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
