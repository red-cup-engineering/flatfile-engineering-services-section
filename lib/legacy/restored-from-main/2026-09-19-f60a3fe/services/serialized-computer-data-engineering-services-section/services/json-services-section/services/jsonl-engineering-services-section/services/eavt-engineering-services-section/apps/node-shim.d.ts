interface Buffer { toString(): string }
declare const Buffer: { from(value: string): { toString(encoding: string): string } };
declare const process: { stdin: AsyncIterable<string | Buffer>; stdout: { write(value: string): unknown } };
interface ImportMeta { readonly main: boolean }
declare module "node:fs" { export const appendFileSync: (path: string, data: string, encoding: string) => void; export const existsSync: (path: string) => boolean; export const mkdirSync: (path: string, options: { recursive: boolean }) => void; export const readFileSync: (path: string, encoding: string) => string; }
declare module "node:path" { export const dirname: (path: string) => string; }
declare module "node:assert/strict" { const assert: { deepEqual(actual: unknown, expected: unknown): void; equal(actual: unknown, expected: unknown): void }; export default assert; }
declare module "node:test" { const test: (name: string, body: () => void) => void; export default test; }
