/** Build-time configuration, injected by vite.config.ts `define` from .env.local. */
declare const __CLOUDKIT_CONTAINER_ID__: string;
declare const __CLOUDKIT_ENVIRONMENT__: string;
declare const __CLOUDKIT_API_TOKEN__: string;

export type CloudKitEnvironment = 'development' | 'production';

export interface CloudKitConfig {
  containerId: string;
  environment: CloudKitEnvironment;
  apiToken: string;
}

function readEnvironment(raw: string): CloudKitEnvironment {
  return raw === 'production' ? 'production' : 'development';
}

export const config: CloudKitConfig = {
  containerId: typeof __CLOUDKIT_CONTAINER_ID__ === 'string' ? __CLOUDKIT_CONTAINER_ID__ : '',
  environment: readEnvironment(typeof __CLOUDKIT_ENVIRONMENT__ === 'string' ? __CLOUDKIT_ENVIRONMENT__ : ''),
  apiToken: typeof __CLOUDKIT_API_TOKEN__ === 'string' ? __CLOUDKIT_API_TOKEN__ : '',
};

/** Names of missing config values, so the UI can explain what to fix. */
export function missingConfig(c: CloudKitConfig = config): string[] {
  const missing: string[] = [];
  if (!c.containerId) missing.push('CLOUDKIT_CONTAINER_ID');
  if (!c.apiToken) missing.push('CLOUDKIT_API_TOKEN');
  return missing;
}
