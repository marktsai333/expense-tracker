/*
 * Runtime bridge for the one user-facing phone entry point.
 *
 * phone-demo.html promotes the approved combined demo into the top-level
 * document. This bridge reuses the already-tested phone-only behaviour from
 * phone-shell.html without changing the approved source file itself.
 */
(() => {
  const reportFailure = (message) => {
    document.body.innerHTML = `<main style="padding:24px;color:#1c2226;font:16px/1.6 -apple-system,BlinkMacSystemFont,'PingFang TC',sans-serif">${message}</main>`;
  };

  const boot = async () => {
    try {
      const response = await fetch('./phone-shell.html?runtime=v10', { cache: 'no-store' });
      if (!response.ok) throw new Error(`runtime source ${response.status}`);
      const shell = await response.text();
      const scripts = Array.from(shell.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi));
      const source = scripts.at(-1)?.[1] || '';
      const marker = "frame.addEventListener('load', () => {";
      const start = source.indexOf(marker);
      const end = source.lastIndexOf('\n    });');
      if (start < 0 || end <= start) throw new Error('runtime callback not found');

      // Execute the existing phone-only layer against this top-level document.
      // The former iframe object is deliberately a minimal inert adapter: no
      // height is ever changed, so the PWA has exactly one safe-area geometry.
      const frame = { contentDocument: document, src: location.href, style: {} };
      const error = { style: {} };
      const callbackBody = source.slice(start + marker.length, end);
      new Function('frame', 'error', callbackBody)(frame, error);
      document.documentElement.dataset.phoneRuntime = 'v10';
    } catch (runtimeError) {
      reportFailure('手機版無法載入必要的互動層。請重新開啟 App。');
      console.error(runtimeError);
    }
  };

  boot();
})();
