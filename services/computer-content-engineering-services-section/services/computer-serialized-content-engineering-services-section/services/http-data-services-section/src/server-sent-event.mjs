export function sseEventFrame(event) {
    let frame = "";
    if (event.id !== undefined) frame += `id: ${event.id}\n`;
    if (event.event !== undefined) frame += `event: ${event.event}\n`;
    if (event.retry !== undefined) frame += `retry: ${Math.floor(event.retry)}\n`;
    for (const line of event.data.split("\n"))frame += `data: ${line}\n`;
    return `${frame}\n`;
}
export function sseFrame(name, data, id) {
    return `${id ? `id: ${id}\n` : ""}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}
export function sseCommentFrame(text = "") {
    return `:${text}\n\n`;
}
export function parseSseStream(text) {
    const events = [];
    let eventName;
    let id;
    let retry;
    let dataLines = [];
    const dispatch = ()=>{
        if (dataLines.length === 0 && eventName === undefined && id === undefined && retry === undefined) return;
        events.push(Object.freeze({
            data: dataLines.join("\n"),
            ...eventName !== undefined ? {
                event: eventName
            } : {},
            ...id !== undefined ? {
                id
            } : {},
            ...retry !== undefined ? {
                retry
            } : {}
        }));
        eventName = undefined;
        id = undefined;
        retry = undefined;
        dataLines = [];
    };
    for (const rawLine of text.split(/\r\n|\r|\n/)){
        if (rawLine === "") {
            dispatch();
            continue;
        }
        if (rawLine.startsWith(":")) continue;
        const colon = rawLine.indexOf(":");
        const field = colon === -1 ? rawLine : rawLine.slice(0, colon);
        let value = colon === -1 ? "" : rawLine.slice(colon + 1);
        if (value.startsWith(" ")) value = value.slice(1);
        switch(field){
            case "event":
                eventName = value;
                break;
            case "data":
                dataLines.push(value);
                break;
            case "id":
                if (!value.includes("\0")) id = value;
                break;
            case "retry":
                {
                    if (/^\d+$/.test(value)) retry = Number(value);
                    break;
                }
            default:
                break;
        }
    }
    dispatch();
    return Object.freeze(events);
}
export function sseHeaders() {
    return {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no"
    };
}
export function isEventStream(contentType) {
    return contentType.split(";", 1)[0]?.trim().toLowerCase() === "text/event-stream";
}
