export interface SemanticRecordJournal { readonly root: string; record(request: Record<string, unknown>): Readonly<Record<string, unknown>>; query(request: { readonly objectKind?: string; readonly category: string }): readonly Readonly<Record<string, unknown>>[]; }
export declare function createSemanticRecordJournal(request: { readonly root: string; readonly objectKind?: string }): SemanticRecordJournal;
export declare function recordAdmittedSemanticRecord(request: Record<string, unknown>): object;
export declare function valueAtJsonPointer(value: unknown, pointer: string): unknown;
export declare function bindJsonTemplate(template: unknown, parameters: unknown): unknown;
export declare function recordConfiguredSemanticRecord(request: { readonly configuration: object; readonly parameters: unknown }): object;
export declare function checkConfiguredSemanticRecordReferences(configuration: Record<string, unknown>):
  | { readonly ok: true; readonly rowsChecked: number }
  | { readonly ok: false; readonly refused: "DANGLING_OR_MISSING_SEMANTIC_RECORD_REFERENCE"; readonly rows: readonly { readonly path: string; readonly reason: string }[] };
export declare function checkConfiguredSemanticRecordResponses(configuration: Record<string, unknown>, now?: Date): {
  readonly issues: readonly Readonly<Record<string, unknown>>[];
  readonly answered: number;
  readonly open: number;
  readonly overdue: number;
};
