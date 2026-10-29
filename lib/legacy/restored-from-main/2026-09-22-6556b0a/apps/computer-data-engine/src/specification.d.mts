/**
 * The only schema family that defines computer-data, computer-code,
 * computer-networking, and computer-systems terms. Consumers carry these
 * locators into their bindings; they do not copy term definitions.
 */
export declare const COMPUTER_ENGINEERING_SPECIFICATION_ID: "https://schemas.561.group/computer/computer-engineering.schema.json";
export declare const COMPUTER_ENGINEERING_SPECIFICATION_DOCUMENT: URL;
/** Locate the single `$token.schema.json` document for an engineering term. */
export declare function computerEngineeringTermSchema(tokenName: string): URL;
