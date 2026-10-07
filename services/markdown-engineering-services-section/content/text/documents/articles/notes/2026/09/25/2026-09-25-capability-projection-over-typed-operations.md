---
title: "Capability Projection over Typed Operations"
description: "An engineering note on replacing a legacy Markdown-skill Python server with typed operation admission, bounded command execution, and an MCP projection."
date-created: 2026-09-25
status: current
part-of: computer-engineering-services-section
provenance: "Supersedes emsemioverse-engine copies dated 2026-01-02 and 2026-06-17."
---

# Capability Projection over Typed Operations

The retired engine conflated four different effects: reading Markdown skill
descriptions, selecting an executable action, starting a local process, and
speaking HTTP/MCP. It rebuilt all four in one FastAPI package and treated a
directory scan plus YAML frontmatter as permission to run a program.

The surviving carrier is an admitted typed operation. Its code declaration
names a domain, codomain, effects, and either a portable SEN term or an
explicit host capability. `typed-operation.mjs` admits and executes that
carrier; it does not select a host, registry, or network protocol. A system
platform supplies only a selected immutable operation set, provider lifetime,
and request-time host resolution.

Markdown remains data. The Markdown engineering section inventories confined
Markdown vaults and reads YAML/TOML frontmatter. It does not interpret a
document as executable authority. A caller may construct typed operations
from admitted engineering data, but the operation declaration and its granted
effects are the executable boundary.

Local process execution is the JSNode command execution service: an exact
program, argument vector, absolute working directory, environment, input,
and immutable receipt. It never uses a shell. A caller may impose a positive
timeout as local execution policy, keeping the bound out of the caller's
command data. This preserves the legacy engine's bounded subprocess effect
without recreating its runtime guessing or lossy command-line encoding.

MCP is a networking projection: `mcp-json-rpc` maps an already selected tool
catalog and dispatcher to JSON-RPC over stdio or HTTP, admitting tool
arguments against their declared schemas. It neither discovers files nor
creates a second operation model. REST/OpenAPI scaffolding, a fabricated
directory-resource protocol, a generated manifest cache, and permissive CORS
were therefore retired rather than carried forward.
