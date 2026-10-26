// CloudKit schema-as-code and management tasks via CKTool JS (works on Linux, macOS, Windows).
//   ck.ts validate|import|export|reset|teams|token
//
// Schema commands target the *development* environment only. Promote to production with
// CloudKit Console > Schema > "Deploy Schema Changes…" (see docs).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { die, info, REPO_ROOT, requireVar, setEnvVar, warn } from './lib/common.ts';
import { CKEnvironment, describeError, File, managementApi, TOKEN_VAR } from './lib/cktool.ts';
import { ask, askSecret } from './lib/prompt.ts';

const SCHEMA_FILE = join(REPO_ROOT, 'cloudkit', 'schema.ckdb');
const EXPORT_FILE = join(REPO_ROOT, 'cloudkit', 'schema.exported.ckdb');
const rel = (p: string) => relative(REPO_ROOT, p);

function target() {
  return {
    teamId: requireVar('APPLE_TEAM_ID', 'your 10-character Apple Developer Team ID; see: mise run ck:teams'),
    containerId: requireVar('CLOUDKIT_CONTAINER_ID'),
    environment: CKEnvironment.DEVELOPMENT,
  };
}

const schemaFile = () => new File([readFileSync(SCHEMA_FILE)], 'schema.ckdb', { type: 'text/plain' });

async function validate(api: Awaited<ReturnType<typeof managementApi>>, t: ReturnType<typeof target>) {
  const { result } = await api.validateSchema({ ...t, file: schemaFile() });
  if (!result.isValid) die(`${rel(SCHEMA_FILE)} is not valid: ${result.errorMessage ?? 'no details'}`);
}

const commands: Record<string, () => Promise<void>> = {
  async validate() {
    const t = target();
    info(`Validating ${rel(SCHEMA_FILE)} against ${t.containerId} (development)`);
    await validate(await managementApi(), t);
    info('Schema is valid.');
  },

  async import() {
    const t = target();
    const api = await managementApi();
    info(`Validating, then importing ${rel(SCHEMA_FILE)} into ${t.containerId} (development)`);
    await validate(api, t);
    await api.importSchema({ ...t, file: schemaFile() });
    info('Imported. Deploy to production from CloudKit Console when ready.');
  },

  async export() {
    const t = target();
    info(`Exporting development schema to ${rel(EXPORT_FILE)}`);
    const { result } = await (await managementApi()).exportSchema(t);
    writeFileSync(EXPORT_FILE, await result.text());
    info(`Compare with: diff ${rel(SCHEMA_FILE)} ${rel(EXPORT_FILE)}`);
  },

  async reset() {
    const t = target();
    warn(`This resets the DEVELOPMENT schema and deletes ALL development data in ${t.containerId}.`);
    if (!process.stdin.isTTY) die('Refusing to reset without an interactive confirmation.');
    if ((await ask('Type the container ID to confirm: ')) !== t.containerId) {
      die('Confirmation did not match; nothing changed.');
    }
    await (await managementApi()).resetToProduction(t);
    info('Development environment reset to the production schema.');
  },

  async teams() {
    const { result } = await (await managementApi()).getTeams();
    for (const team of result.teams) console.log(`${team.teamId}  ${team.teamName}`);
  },

  async token() {
    if (!process.stdin.isTTY) die('Run this in a terminal; it prompts for the token.');
    const token = await askSecret('Paste the CloudKit management token (input hidden): ');
    if (!token) die('No token entered; nothing changed.');
    setEnvVar(TOKEN_VAR, token);
    info(`Saved ${TOKEN_VAR} in .env.local (gitignored). Check it with: mise run ck:teams`);
  },
};

const name = process.argv[2] ?? '';
const command = commands[name] ?? die(`usage: ck.ts ${Object.keys(commands).join('|')}`);
try {
  await command();
} catch (e) {
  die(describeError(e));
}
