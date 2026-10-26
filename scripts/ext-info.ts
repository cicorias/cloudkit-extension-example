// Print the extension ID and the CloudKit Sign In Callback URL derived from EXTENSION_PUBLIC_KEY.
import { requireVar } from './lib/common.ts';
import { extInfoText } from './lib/extension-id.ts';

console.log(extInfoText(requireVar('EXTENSION_PUBLIC_KEY', 'run: mise run ext:key')));
