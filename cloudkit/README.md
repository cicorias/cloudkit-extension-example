# CloudKit schema

`schema.ckdb` is the single source of truth for the container schema
([ADR-0006](../docs/adr/0006-schema-as-code-with-cktool.md)). It uses Apple's text schema
language, the same format `cktool export-schema` produces. The file has no comments because
cktool's grammar is strict, so the notes live here.

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
mise run ck:token      # once: put a management token in the keychain
mise run ck:teams      # find your APPLE_TEAM_ID
mise run ck:validate   # dry run against the development environment
mise run ck:import     # apply to development
mise run ck:export     # pull the live schema to schema.exported.ckdb and diff it
```

cktool can only change the **development** environment. To promote, open CloudKit Console,
go to **Schema**, then choose **Deploy Schema Changes…**. Production schema changes are
additive only: you can't delete or rename a type or field once it's deployed, so plan new
fields with that in mind.
