// OpenSession connector (fork addition — oceanseth/xChatHub).
//
// Runs on opensession.groupnetwork.com (and localhost dev) and relays xchat tool calls
// between the OpenSession web app and the background worker, which routes them to the
// WebMCP tools on an open x.com tab (src/webmcp/tools.ts). This is what lets the
// OpenSession chat HUD list/read/send the user's own X DMs without any server touching
// message content: page → here → background → x.com content relay → MAIN-world tools.
//
// Protocol with the page (window.postMessage, same-origin):
//   page → us:  { xchatos: 'hello' }                       — request a status announce
//   page → us:  { xchatos: 'call', id, name, args }        — invoke a tool
//   us → page:  { xchatos: 'status', connected: boolean }  — extension present; x.com tab?
//   us → page:  { xchatos: 'result', id, result }          — MCP-shaped tool result
//
// Mirrors bridge-relay.ts: MV3 service workers sleep and disconnect the Port; reconnect
// restores the relay and wakes the worker.

const PORT_NAME = 'xchat-opensession';

export default defineContentScript({
  matches: ['https://opensession.groupnetwork.com/*', 'http://localhost/*'],
  main() {
    let port: chrome.runtime.Port | null = null;

    const toPage = (msg: Record<string, unknown>) => {
      window.postMessage(msg, location.origin);
    };

    // Presence beacon: announce immediately on load, before the background
    // round-trip, so the page learns the extension exists even if it loaded
    // first and its hello went unheard. Real connected-status follows.
    toPage({ xchatos: 'status', connected: false });

    function connect(): void {
      try {
        port = chrome.runtime.connect({ name: PORT_NAME });
      } catch {
        port = null; // extension reloaded — this orphaned script stands down
        toPage({ xchatos: 'status', connected: false });
        return;
      }
      port.onMessage.addListener((msg: { type?: string; id?: number; result?: unknown; connected?: boolean }) => {
        if (msg?.type === 'result') toPage({ xchatos: 'result', id: msg.id, result: msg.result });
        else if (msg?.type === 'status') toPage({ xchatos: 'status', connected: !!msg.connected });
      });
      port.onDisconnect.addListener(() => {
        port = null;
        setTimeout(connect, 1000);
      });
    }

    window.addEventListener('message', (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data as { xchatos?: string; id?: number; name?: string; args?: unknown };
      if (d?.xchatos === 'call' && typeof d.id === 'number' && typeof d.name === 'string') {
        try {
          port?.postMessage({ type: 'call', id: d.id, name: d.name, args: d.args });
        } catch {
          toPage({
            xchatos: 'result',
            id: d.id,
            result: { content: [{ type: 'text', text: 'Extension relay disconnected — retrying.' }], isError: true },
          });
        }
      } else if (d?.xchatos === 'hello') {
        try {
          port?.postMessage({ type: 'hello' });
        } catch {
          toPage({ xchatos: 'status', connected: false });
        }
      }
    });

    connect();
  },
});
