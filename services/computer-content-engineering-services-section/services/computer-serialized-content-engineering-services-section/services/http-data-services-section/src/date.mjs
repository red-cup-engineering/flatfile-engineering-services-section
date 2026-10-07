export function httpDate(when = new Date()) {
    return new Date(when).toUTCString();
}
export function parseHttpDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
