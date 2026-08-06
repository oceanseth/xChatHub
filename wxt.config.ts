import { defineConfig } from 'wxt';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// xchat — an in-page enhancer for X (Twitter) DMs.
// One content script on the DM routes + a tiny background worker.
// No cookies / API / declarativeNetRequest: X does all data/crypto/realtime/sending;
// we only enhance the rendered page. Minimal permission footprint.
export default defineConfig({
  outDir: 'dist',
  outDirTemplate: '.',
  manifest: {
    name: 'OpenSession xChat — X DMs + session HUD bridge',
    description:
      'Keyboard-first X DMs (xChat) plus the OpenSession connector: DM GitHub collaborators from opensession.groupnetwork.com.',
    // version comes from package.json (WXT default) so a release tag drives it — see the
    // "Set version from tag" step in .github/workflows/release.yml.
    host_permissions: ['https://x.com/*'],
    // NOTE (fork): upstream pins the xChat store item's public key here so unpacked builds
    // share its ID. OpenSession xChat is its own store item — no pinned key, so it coexists
    // with upstream xChat instead of conflicting. (Local MCP bridge users: the bridge pins
    // upstream's id by default — pass --allow-origin chrome-extension://<this build's id>.)
    // Clickable toolbar icon (no popup) — background.ts handles onClicked to open OpenSession.
    action: {
      default_title: 'Open OpenSession',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
  },
  alias: { '@': srcDir },
  webExt: {
    // Don't auto-open a browser in this environment; load dist/ manually.
    disabled: true,
  },
});
