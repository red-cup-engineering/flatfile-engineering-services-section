export interface RmnJsonSchema {
  readonly $id: string;
  readonly title: string;
  readonly description: string;
  readonly anyOf: readonly Readonly<Record<string, unknown>>[];
}

export const TySchema: RmnJsonSchema;
export const TmSchema: RmnJsonSchema;
