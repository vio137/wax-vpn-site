# waX VPN website

Live: https://waxvpn.pages.dev/

Static HTML, CSS and JavaScript, deployed from this repository to Cloudflare Pages. Product releases live in [vio137/wax-vpn](https://github.com/vio137/wax-vpn).

## Local checks

`npm ci`, then `npx playwright install chromium` and `npm test`.

The browser checks cover mobile navigation, screenshot tabs and keyboard controls, the lightbox, exact checksum copying, reduced motion, no-JavaScript content and overflow at 320-1920px. Test screenshots are written to `.test-results/`.

The animated tunnel is an abstract illustration, not measured network traffic. App images are the original version-labeled Windows verification captures. Detailed verification scope and known limits are retained on the download panel; the history page keeps the original historical entries.

The footer wordmark is decorative and hidden from assistive technology.
