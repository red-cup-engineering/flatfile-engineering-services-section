import { escapeHtmlText as escapeHtml } from "./web-feed.mjs";
export function pageLinksNav(links, ariaLabel = "Pagination") {
    const previous = links.previous;
    const next = links.next;
    const renderedLinks = [
        `<a rel="self" href="${escapeHtml(links.self)}">self</a>`,
        `<a rel="first" href="${escapeHtml(links.first)}">first</a>`,
        previous ? `<a rel="prev" href="${escapeHtml(previous)}">previous</a>` : "",
        next ? `<a rel="next" href="${escapeHtml(next)}">next</a>` : "",
        `<a rel="last" href="${escapeHtml(links.last)}">last</a>`,
    ].filter(Boolean).join(" ");
    return `<nav class="pagination" aria-label="${escapeHtml(ariaLabel)}">${renderedLinks}</nav>`;
}
