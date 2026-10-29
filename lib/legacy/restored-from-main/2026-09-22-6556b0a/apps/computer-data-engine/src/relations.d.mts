import { type DataType, type Result, type TypeValue } from "./type-system.mjs";
/** A predicate's three typed positions. Witnesses distinguish observations of one claim. */
export type Relation<D extends DataType = DataType, C extends DataType = DataType, W extends DataType = DataType> = Readonly<{
    id: string;
    domain: D;
    codomain: C;
    witness: W;
}>;
export type Statement<R extends Relation = Relation> = Readonly<{
    subject: TypeValue<R["domain"]>;
    predicate: string;
    object: TypeValue<R["codomain"]>;
    witness: TypeValue<R["witness"]>;
}>;
export type AddressedStatement = Readonly<{
    id: string;
    statement: Statement;
}>;
export type RelationRefusal = Readonly<{
    code: string;
    message: string;
}>;
export type RelationalField = Readonly<{
    catalogIdentity: string;
    relations: readonly Relation[];
    statements: readonly AddressedStatement[];
}>;
export type RelationalFieldDocument = Readonly<{
    version: 1;
    catalogIdentity: string;
    statements: readonly AddressedStatement[];
}>;
/** Establish one predicate over the common type system, including all inherited constraints. */
export declare function defineRelation<D extends DataType, C extends DataType, W extends DataType>(definition: Relation<D, C, W>): Result<Relation<D, C, W>, RelationRefusal>;
/** Admit an actual typed assertion; the predicate is resolved, never a decorative label. */
export declare function admitStatement<R extends Relation>(relation: R, value: unknown): Result<Readonly<{
    id: string;
    statement: Statement<R>;
}>, RelationRefusal>;
/** Admit a complete immutable field. Set union retains differing claims and their witnesses. */
export declare function createRelationalField(declarations: readonly Relation[], values?: readonly unknown[]): Result<RelationalField, RelationRefusal>;
/** Query all matching assertions. Contradictory objects remain separately addressable. */
export declare function queryRelationalField(field: RelationalField, predicate: string): readonly AddressedStatement[];
/** Merge replica assertions against one receiving catalog; all bytes are re-admitted. */
export declare function mergeRelationalFields(declarations: readonly Relation[], ...fields: readonly RelationalField[]): Result<RelationalField, RelationRefusal>;
/** The complete portable carrier; executable declarations are resolved at the receiver. */
export declare function relationalFieldDocument(field: RelationalField): RelationalFieldDocument;
/** Validate both the receiving semantic catalog and every advertised content address. */
export declare function admitRelationalFieldDocument(declarations: readonly Relation[], input: unknown): Result<RelationalField, RelationRefusal>;
