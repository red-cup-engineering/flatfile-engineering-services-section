/**
 * cron-services-section/schedule — the five-field cron calendar rule (POSIX crontab(5)) as
 * Kubernetes' CronJob reads it: a `schedule` and the IANA `timeZone` it is read in. The rule
 * denotes a set of instants. This module is that denotation: whether an instant is scheduled, the
 * latest scheduled instant at or before a time, and the first one after it.
 *
 * Fields are minute (0-59), hour (0-23), day of month (1-31), month (1-12 or JAN-DEC) and day of
 * week (0-7 or SUN-SAT, where 7 is Sunday again). Each field is `*`, a value, a range `a-b`, a step
 * `*\/n` or `a-b/n` or `a/n`, or a comma list of those. `@yearly`, `@annually`, `@monthly`,
 * `@weekly`, `@daily`, `@midnight` and `@hourly` name their usual rules. As in the cron Kubernetes
 * runs (robfig/cron), a day of month and a day of week both restricted (neither starting with `*`
 * or `?`) match when either matches, and otherwise both must.
 *
 * Wall time is read in the schedule's time zone, so a rule keeps its local hour across daylight
 * saving. A wall time the zone skips (spring forward) does not occur. A wall time the zone repeats
 * (fall back) occurs once, at its first instant. So scheduled instants keep their wall-clock order,
 * and the search is bounded: a rule that matches no day in five years has no instant.
 * @packageDocumentation
 */

const FIELDS = Object.freeze([
  Object.freeze({ name: "minute", min: 0, max: 59 }),
  Object.freeze({ name: "hour", min: 0, max: 23 }),
  Object.freeze({ name: "day of month", min: 1, max: 31 }),
  Object.freeze({ name: "month", min: 1, max: 12, names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], base: 1 }),
  Object.freeze({ name: "day of week", min: 0, max: 7, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], base: 0 }),
]);

export const CRON_NICKNAMES = Object.freeze({
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
});

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
// robfig/cron gives up after five years; a rule that matches nothing in that span matches nothing.
const SEARCH_DAYS = 5 * 366;

function valueOf(token, field, expression) {
  const upper = token.toUpperCase();
  const named = field.names?.indexOf(upper) ?? -1;
  if (named !== -1) return named + field.base;
  if (!/^\d+$/.test(token)) throw new TypeError(`cron: ${field.name} value ${JSON.stringify(token)} in ${JSON.stringify(expression)} is not a number${field.names ? " or name" : ""}`);
  return Number(token);
}

function fieldOf(text, field, expression) {
  const values = new Set();
  for (const item of text.split(",")) {
    if (item === "") throw new TypeError(`cron: empty ${field.name} list item in ${JSON.stringify(expression)}`);
    const [body, stepText, extra] = item.split("/");
    if (extra !== undefined) throw new TypeError(`cron: ${field.name} item ${JSON.stringify(item)} has two steps`);
    const step = stepText === undefined ? 1 : valueOf(stepText, { name: `${field.name} step` }, expression);
    if (step < 1) throw new TypeError(`cron: ${field.name} step in ${JSON.stringify(item)} must be at least 1`);
    let low;
    let high;
    if (body === "*" || body === "?") {
      low = field.min;
      high = field.max;
    } else if (body.includes("-")) {
      const [from, to, more] = body.split("-");
      if (more !== undefined) throw new TypeError(`cron: ${field.name} range ${JSON.stringify(body)} has two dashes`);
      low = valueOf(from, field, expression);
      high = valueOf(to, field, expression);
    } else {
      low = valueOf(body, field, expression);
      high = stepText === undefined ? low : field.max;
    }
    if (low < field.min || high > field.max || low > high) {
      throw new RangeError(`cron: ${field.name} item ${JSON.stringify(item)} in ${JSON.stringify(expression)} lies outside ${field.min}-${field.max}`);
    }
    for (let value = low; value <= high; value += step) values.add(value);
  }
  return values;
}

const restricted = (text) => !text.startsWith("*") && !text.startsWith("?");
const sortedDescending = (values) => Object.freeze([...values].sort((a, b) => b - a));

/**
 * A cron rule read once: its fields as sets, frozen. Throws on a malformed rule, naming the field.
 * @param {string} expression five fields, or one of CRON_NICKNAMES
 */
export function cronRuleOf(expression) {
  if (typeof expression !== "string" || expression.trim() === "") throw new TypeError("cron: a schedule is a nonempty string");
  const trimmed = expression.trim();
  if (/^(?:CRON_)?TZ=/i.test(trimmed)) throw new TypeError("cron: a schedule names its time zone in timeZone, never inside the expression");
  const expanded = CRON_NICKNAMES[trimmed.toLowerCase()] ?? trimmed;
  const parts = expanded.split(/\s+/);
  if (parts.length !== 5) throw new TypeError(`cron: ${JSON.stringify(expression)} has ${parts.length} fields, not 5`);
  const [minutes, hours, days, months, weekdays] = parts.map((text, index) => fieldOf(text, FIELDS[index], expression));
  if (weekdays.delete(7)) weekdays.add(0);
  return Object.freeze({
    expression: trimmed,
    minutes: sortedDescending(minutes),
    hours: sortedDescending(hours),
    days: Object.freeze(new Set(days)),
    months: Object.freeze(new Set(months)),
    weekdays: Object.freeze(new Set(weekdays)),
    dayRestricted: restricted(parts[2]),
    weekdayRestricted: restricted(parts[4]),
  });
}

const formatters = new Map();
function formatterOf(timeZone) {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    // Intl refuses a zone it does not know with a RangeError, which is the refusal here too.
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Throws unless timeZone is an IANA zone this runtime knows. */
export function assertTimeZone(timeZone) {
  if (typeof timeZone !== "string" || timeZone === "") throw new TypeError("cron: a time zone is an IANA zone name");
  formatterOf(timeZone);
  return timeZone;
}

/** The wall clock in a zone at an instant: { year, month, day, hour, minute, second }. */
export function wallClockOf(ms, timeZone) {
  const wall = {};
  for (const part of formatterOf(timeZone).formatToParts(ms)) {
    if (part.type !== "literal") wall[part.type] = Number(part.value);
  }
  return Object.freeze({ year: wall.year, month: wall.month, day: wall.day, hour: wall.hour, minute: wall.minute, second: wall.second });
}

// The zone's offset from UTC at an instant, in milliseconds, at minute resolution.
const offsetAt = (ms, timeZone) => {
  const wall = wallClockOf(ms, timeZone);
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second) - Math.floor(ms / 1000) * 1000;
};

/**
 * The first instant a zone's wall clock reads a civil minute, or undefined when the zone skips it.
 * Offsets change at most once in a day here, so the offsets half a day before and after cover it.
 */
export function firstInstantOfWall({ year, month, day, hour, minute }, timeZone) {
  const local = Date.UTC(year, month - 1, day, hour, minute);
  let first;
  for (const offset of new Set([offsetAt(local - DAY_MS / 2, timeZone), offsetAt(local + DAY_MS / 2, timeZone)])) {
    const instant = local - offset;
    const wall = wallClockOf(instant, timeZone);
    const reads = wall.year === year && wall.month === month && wall.day === day && wall.hour === hour && wall.minute === minute;
    if (reads && (first === undefined || instant < first)) first = instant;
  }
  return first;
}

// A civil date k days from another, through UTC arithmetic, which has no zone and no gaps.
const civilDay = ({ year, month, day }, k) => {
  const date = new Date(Date.UTC(year, month - 1, day + k));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay() };
};

function dayMatches(rule, date) {
  if (!rule.months.has(date.month)) return false;
  const byDay = rule.days.has(date.day);
  const byWeekday = rule.weekdays.has(date.weekday);
  if (rule.dayRestricted && rule.weekdayRestricted) return byDay || byWeekday;
  return byDay && byWeekday;
}

const ruleOf = (schedule) => (typeof schedule === "string" ? cronRuleOf(schedule) : schedule);
const msOf = (at) => (typeof at === "number" ? at : Date.parse(at));

/**
 * The latest instant the rule schedules at or before `at`, in milliseconds, or undefined.
 * @param {string | ReturnType<typeof cronRuleOf>} schedule
 * @param {string} timeZone
 * @param {number | string} at an instant (ms or ISO string)
 */
export function latestScheduledAtOrBefore(schedule, timeZone, at) {
  const rule = ruleOf(schedule);
  const ms = msOf(at);
  if (!Number.isFinite(ms)) throw new TypeError("cron: at is an instant");
  assertTimeZone(timeZone);
  const today = wallClockOf(ms, timeZone);
  for (let k = 0; k <= SEARCH_DAYS; k += 1) {
    const date = civilDay(today, -k);
    if (!dayMatches(rule, date)) continue;
    for (const hour of rule.hours) {
      // A wall hour two past now is in the future on any zone this side of a fall back.
      if (k === 0 && hour > today.hour + 1) continue;
      for (const minute of rule.minutes) {
        const instant = firstInstantOfWall({ ...date, hour, minute }, timeZone);
        if (instant !== undefined && instant <= ms) return instant;
      }
    }
  }
  return undefined;
}

/** The first instant the rule schedules strictly after `at`, in milliseconds, or undefined. */
export function nextScheduledAfter(schedule, timeZone, at) {
  const rule = ruleOf(schedule);
  const ms = msOf(at);
  if (!Number.isFinite(ms)) throw new TypeError("cron: at is an instant");
  assertTimeZone(timeZone);
  const today = wallClockOf(ms, timeZone);
  const ascendingHours = [...rule.hours].reverse();
  const ascendingMinutes = [...rule.minutes].reverse();
  for (let k = 0; k <= SEARCH_DAYS; k += 1) {
    const date = civilDay(today, k);
    if (!dayMatches(rule, date)) continue;
    for (const hour of ascendingHours) {
      if (k === 0 && hour < today.hour - 1) continue;
      for (const minute of ascendingMinutes) {
        const instant = firstInstantOfWall({ ...date, hour, minute }, timeZone);
        if (instant !== undefined && instant > ms) return instant;
      }
    }
  }
  return undefined;
}

/** Whether the rule schedules exactly this instant (a whole minute that is the first instant of its wall time). */
export function isScheduledAt(schedule, timeZone, at) {
  const ms = msOf(at);
  return ms % MINUTE_MS === 0 && latestScheduledAtOrBefore(schedule, timeZone, ms) === ms;
}
