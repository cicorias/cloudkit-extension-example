# CloudKit schema

`schema.ckdb` is the single source of truth for the container schema
([ADR-0012](../docs/adr/0012-cktool-js-for-schema-automation.md)). It uses Apple's text schema
language, the same format `mise run ck:export` (CKTool JS `exportSchema`) produces. The file has
no comments because the grammar is strict, so the notes live here.

| Record type | Database | Notes |
|---|---|---|
| `Users` | system | Built-in. Every CloudKit schema must include it. |
| `Todo` | private | One record per item. `___recordID QUERYABLE` is required for an unfiltered `records/query`. |
| `Settings` | private | A single record named `user-settings` that holds preferences synced across browsers. |

### `Todo` fields

| Field | Type | Meaning |
|---|---|---|
| `title` | STRING | Required text. Queryable, searchable and sortable. |
| `notes` | STRING | Optional longer text. |
| `done` | INT64 | `0` or `1`. CloudKit has no boolean type. |
| `priority` | INT64 | `0` none, `1` low, `2` medium, `3` high. |
| `dueDate` | TIMESTAMP | Milliseconds since the epoch. Optional. |
| `tags` | LIST&lt;STRING&gt; | Free-form labels. |

The TypeScript mapping is in [`src/lib/todos.ts`](../src/lib/todos.ts). Keep the two in sync.

## Workflow

```sh
mise run ck:token      # once: save a management token in .env.local (or export it in .envrc)
mise run ck:teams      # find your APPLE_TEAM_ID
mise run ck:validate   # dry run against the development environment
mise run ck:import     # apply to development
mise run ck:export     # pull the live schema to schema.exported.ckdb and diff it
```

The `ck:*` tasks only change the **development** environment. To promote, open CloudKit Console,
go to **Schema**, then choose **Deploy Schema Changes…**. Production schema changes are
additive only: you can't delete or rename a type or field once it's deployed, so plan new
fields with that in mind.
