const DAY = /(?<![0-9])([1-9][0-9]{3})([-_./]?)(0[1-9]|1[0-2])\2(0[1-9]|[12][0-9]|3[01])(?:(?:T([01][0-9]|2[0-3]):?([0-5][0-9]))|(?:-([01][0-9]|2[0-3])([0-5][0-9])h))?(?![0-9])/gu;
const MONTH = /(?<![0-9])([1-9][0-9]{3})([-_./])(0[1-9]|1[0-2])(?![0-9])/gu;
const YEAR = /(?<![0-9])([1-9][0-9]{3})(?![0-9])/gu;
const MONTH_NAMES = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const NATURAL_MONTH_DAY_YEAR = new RegExp(`\\b(${MONTH_NAMES})[ \\t]+([0-3]?[0-9])(?:st|nd|rd|th)?[,]?[ \\t]+([1-9][0-9]{3})(?:[,][ \\t]+([0-1]?[0-9]):([0-5][0-9])(?::[0-5][0-9])?[ \\t]*(am|pm))?`, "giu");
const NATURAL_YEAR_MONTH_DAY = new RegExp(`\\b([1-9][0-9]{3})[,]?[ \\t]+(${MONTH_NAMES})[ \\t]+([0-3]?[0-9])(?:st|nd|rd|th)?\\b`, "giu");
const NATURAL_MONTH_YEAR = new RegExp(`\\b(${MONTH_NAMES})[ \\t]+([1-9][0-9]{3})\\b`, "giu");
const monthNumbers = new Map();
for (const [index, name] of ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].entries()) {
  monthNumbers.set(name, String(index + 1).padStart(2, "0"));
  monthNumbers.set(name.slice(0, 3), String(index + 1).padStart(2, "0"));
}

function validDay(year, month, day) {
  const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return value.getUTCFullYear() === Number(year) && value.getUTCMonth() === Number(month) - 1 && value.getUTCDate() === Number(day);
}

function overlaps(start, end, occupied) {
  return occupied.some(([occupiedStart, occupiedEnd]) => start < occupiedEnd && end > occupiedStart);
}

function freezeEvidence({ precision, date, time = null, lexeme, offset, source }) {
  return Object.freeze({ precision, date, time, lexeme, offset, source });
}

function naturalTime(hour, minute, meridiem) {
  if (hour === undefined) return null;
  let numericHour = Number(hour);
  if (numericHour < 1 || numericHour > 12) return null;
  if (meridiem.toLowerCase() === "am" && numericHour === 12) numericHour = 0;
  if (meridiem.toLowerCase() === "pm" && numericHour !== 12) numericHour += 12;
  return `${String(numericHour).padStart(2, "0")}:${minute}`;
}

/** Measure every explicit date lexeme in one provenance locator; selection is deliberately a separate concern. */
export function measureMarkdownDateEvidence({ locator, source = "provenance-locator" }) {
  if (typeof locator !== "string" || locator.length === 0) throw new TypeError("locator must be a nonempty string");
  if (typeof source !== "string" || source.length === 0) throw new TypeError("source must be a nonempty string");
  const evidence = [];
  const rejected = [];
  const occupied = [];
  for (const match of locator.matchAll(DAY)) {
    const [lexeme, year, , month, day, tHour, tMinute, hHour, hMinute] = match;
    if (!validDay(year, month, day)) {
      rejected.push(Object.freeze({ lexeme, offset: match.index, reason: "not-a-calendar-date", source }));
      occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
      continue;
    }
    const hour = tHour ?? hHour;
    const minute = tMinute ?? hMinute;
    evidence.push(freezeEvidence({ precision: "day", date: `${year}-${month}-${day}`, time: hour === undefined ? null : `${hour}:${minute}`, lexeme, offset: match.index, source }));
    occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
  }
  for (const match of locator.matchAll(NATURAL_MONTH_DAY_YEAR)) {
    const [lexeme, monthName, unpaddedDay, year, hour, minute, meridiem] = match;
    const month = monthNumbers.get(monthName.toLowerCase());
    const day = unpaddedDay.padStart(2, "0");
    if (!validDay(year, month, day)) {
      rejected.push(Object.freeze({ lexeme, offset: match.index, reason: "not-a-calendar-date", source }));
      occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
      continue;
    }
    evidence.push(freezeEvidence({ precision: "day", date: `${year}-${month}-${day}`, time: naturalTime(hour, minute, meridiem), lexeme, offset: match.index, source }));
    occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
  }
  for (const match of locator.matchAll(NATURAL_YEAR_MONTH_DAY)) {
    const [lexeme, year, monthName, unpaddedDay] = match;
    const month = monthNumbers.get(monthName.toLowerCase());
    const day = unpaddedDay.padStart(2, "0");
    if (!validDay(year, month, day)) {
      rejected.push(Object.freeze({ lexeme, offset: match.index, reason: "not-a-calendar-date", source }));
      occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
      continue;
    }
    evidence.push(freezeEvidence({ precision: "day", date: `${year}-${month}-${day}`, lexeme, offset: match.index, source }));
    occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
  }
  for (const match of locator.matchAll(MONTH)) {
    const [lexeme, year, , month] = match;
    if (overlaps(match.index, match.index + lexeme.length, occupied)) continue;
    evidence.push(freezeEvidence({ precision: "month", date: `${year}-${month}`, lexeme, offset: match.index, source }));
    occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
  }
  for (const match of locator.matchAll(NATURAL_MONTH_YEAR)) {
    const [lexeme, monthName, year] = match;
    if (overlaps(match.index, match.index + lexeme.length, occupied)) continue;
    evidence.push(freezeEvidence({ precision: "month", date: `${year}-${monthNumbers.get(monthName.toLowerCase())}`, lexeme, offset: match.index, source }));
    occupied.push(Object.freeze([match.index, match.index + lexeme.length]));
  }
  for (const match of locator.matchAll(YEAR)) {
    const [lexeme, year] = match;
    if (overlaps(match.index, match.index + lexeme.length, occupied)) continue;
    evidence.push(freezeEvidence({ precision: "year", date: year, lexeme, offset: match.index, source }));
  }
  evidence.sort((left, right) => left.offset - right.offset || right.date.length - left.date.length);
  return Object.freeze({ kind: "red-cup-engineering.markdown-date-evidence-measurement", locator, evidence: Object.freeze(evidence), rejected: Object.freeze(rejected) });
}
