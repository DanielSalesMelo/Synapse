export const SYNAPSE_TIME_ZONE = "America/Sao_Paulo";

const toDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDateTimeBR(value?: string | Date | null, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SYNAPSE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute} BRT`;
}
