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

export function formatDateBR(value?: string | Date | null, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SYNAPSE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatTimeBR(value?: string | Date | null, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SYNAPSE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYNAPSE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getParts(date);
  const utcFromZonedParts = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return utcFromZonedParts - date.getTime();
}

export function toSaoPauloDateTimeLocalInput(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return "";
  const parts = getParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function saoPauloDateTimeLocalToIso(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return "";
  const [, year, month, day, hour, minute] = match.map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstPass = new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc)));
  const corrected = new Date(localAsUtc - getTimeZoneOffsetMs(firstPass));
  return corrected.toISOString();
}
