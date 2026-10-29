import { defineType, makeThing, type DataType, type Result, type Thing } from "@red-cup-engineering/computer-data-type-engine";

export type WorkspaceThingDescriptor = Readonly<{ path: string; kind: string; semanticNi: string }>;
export type WorkspaceThingAlias = Readonly<{ alias: string; thingId: string }>;
export type WorkspaceThingProjection = Readonly<{ things: readonly Thing<WorkspaceThingDescriptor>[]; aliases: readonly WorkspaceThingAlias[] }>;
export type WorkspaceThingProjectionRefusal = Readonly<{ kind: "invalid-workspace-graph" | "thing-refusal"; message: string }>;

const declared = defineType({ id: "urn:red-cup-engineering:workspace-content-resource:1", name: "Workspace content resource", description: "An observed workspace descriptor with source provenance.", parents: [], schema: { type: "object", additionalProperties: false, required: ["path", "kind", "semanticNi"], properties: { path: { type: "string", minLength: 1 }, kind: { type: "string", minLength: 1 }, semanticNi: { type: "string", minLength: 1 } } } });
if (!declared.ok) throw new Error(declared.refusal.message);
export const workspaceResourceDescriptorType: DataType = declared.value;

const refuse = (kind: WorkspaceThingProjectionRefusal["kind"], message: string): Result<never, WorkspaceThingProjectionRefusal> => ({ ok: false, refusal: { kind, message } });

/** Project graph descriptors into admitted shared Things; semanticNi remains source provenance. */
export const projectWorkspaceResourceThings = (graph: unknown): Result<WorkspaceThingProjection, WorkspaceThingProjectionRefusal> => {
  if (!graph || typeof graph !== "object" || !Array.isArray((graph as { resources?: unknown }).resources)) return refuse("invalid-workspace-graph", "WorkspaceContentGraph resources are required");
  const input = graph as { resources: readonly WorkspaceThingDescriptor[]; packages?: readonly { name?: string; id?: string; actor?: string; manifestNi?: string }[] };
  const things: Thing<WorkspaceThingDescriptor>[] = [], aliases: WorkspaceThingAlias[] = [];
  for (const resource of input.resources) {
    const made = makeThing({ type: workspaceResourceDescriptorType, attributes: resource });
    if (!made.ok) return refuse("thing-refusal", `workspace resource ${JSON.stringify(resource?.path)} was not admitted`);
    things.push(made.value);
    const names = new Set([resource.path, resource.path.split("/").at(-1) ?? ""]);
    for (const pkg of input.packages ?? []) if (pkg.manifestNi === resource.semanticNi) for (const name of [pkg.name, pkg.id, pkg.actor]) if (name) names.add(name);
    for (const alias of [...names].filter(Boolean).sort()) aliases.push(Object.freeze({ alias, thingId: made.value.id }));
  }
  return { ok: true, value: Object.freeze({ things: Object.freeze(things), aliases: Object.freeze(aliases) }) };
};
