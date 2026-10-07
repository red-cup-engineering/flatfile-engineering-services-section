import { niUriDigestBytes } from "@red-cup-engineering/uri-services-section/ni-uri";
import { readFileSync } from "node:fs";

export const inputSchema = Object.freeze({ type: "string" });
export const outputSchema = Object.freeze({ type: ["string", "null"] });

/** Return the SHA-256 hex digest an EAVT identity (an ni URI) names. */
export function digestHex(identity) {
  if (typeof identity !== "string") return null;
  try {
    return Buffer.from(niUriDigestBytes(identity)).toString("hex");
  } catch {
    return null;
  }
}

if (import.meta.main)
  process.stdout.write(
    `${JSON.stringify(digestHex(JSON.parse(readFileSync(0, "utf8"))))}\n`,
  );
