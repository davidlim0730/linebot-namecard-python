# LINE Front-end Framework (LIFF) Overview

LINE Front-end Framework (LIFF) is a platform for web apps provided by LY Corporation. The web apps running on this platform are called LIFF apps.

LIFF apps can get data from the LINE Platform such as the LINE user ID. The LIFF app can use such data to provide features that utilize user data and send messages on the user's behalf.

## Recommended Operating Environment

### LIFF Browser

| Item | Recommended environment | Minimum operating environment |
| --- | --- | --- |
| iOS | Latest version. WKWebView is used. | In accordance with LINE recommended system specs. |
| Android | Latest version. Android WebView is used. | In accordance with LINE recommended system specs. |
| LINE | Latest version | In accordance with LINE recommended system specs. |

### External Browser

LIFF apps run on the latest version of: Microsoft Edge, Google Chrome, Firefox, Safari

## LIFF Browser

LIFF browser is a browser specifically for LIFF apps. When a user opens a LIFF URL in LINE, the LIFF app opens in a LIFF browser.

- Runs within LINE → can access user data without login prompt
- Uses WKWebView (iOS) and Android WebView (Android)
- Supports LINE-specific features like sharing and messaging

**Cache**: Controlled via HTTP headers (Cache-Control). No way to explicitly delete cache.

**Limitations**: Does not support some web technologies supported by external browsers.

## LIFF Browser Sizes

Three sizes available (set when adding LIFF app to LINE Login channel):
- `Compact`
- `Tall`
- `Full` — shows action button in header by default

### Action Button (Full size only)

- Shown by default; hidden by enabling **Module mode**
- LINE ≥ 15.12.0: opens multi-tab view
- LINE < 15.12.0: shows options menu

## Multi-tab View

Displays options + recently used services.

### Options

| Item | Description |
| --- | --- |
| **Refresh** | Reloads the current page |
| **Share** | Shares permanent link via LINE message |
| **Minimize browser** | Minimizes LIFF browser |
| **Permission setting** | View camera/microphone permissions (LINE ≥ 14.6.0) |

### Recently Used Services (LINE ≥ 15.12.0, Full size, module mode off)

- Up to 50 items, ordered by most recent use
- Screenshot taken when LIFF app is closed/switched

| Behavior | Conditions |
| --- | --- |
| **Resume** | Used within last 12 hours AND within 10 most recent items |
| **Reload** | Otherwise — reinitializes at last URL, discards token/history/scroll |

**Note**: `liff.sendMessages()` cannot be used after reloading from recently used services. Must reopen via LIFF URL in chat room.

## Constraints

- **OpenChat**: LIFF apps not officially supported. Retrieving user profile info doesn't work in most cases.
- **`liff.scanCode()`**: Only works in LIFF browser, not external browser.

## Development Tools

| Tool | Purpose |
| --- | --- |
| LIFF starter app | Demo for beginners to understand LIFF initialization |
| Create LIFF App | CLI to scaffold LIFF app development environment |
| LIFF CLI | Create/update/delete LIFF apps, debug with LIFF Inspector, local HTTPS server |
| LIFF Playground | Try LIFF features online (open source) |

## Workflow

1. Create a channel (LINE Login channel) to add LIFF app to
2. Register LIFF app → get LIFF ID
3. Develop LIFF app (use `liff.init()` to initialize)
4. Deploy and test

## References

- [LIFF v2 API Reference](https://developers.line.biz/en/reference/liff/)
- [LIFF Playground](https://liff-playground.netlify.app/)
- [LIFF Playground Source](https://github.com/line/liff-playground)
- [LIFF Release Notes](https://developers.line.biz/en/docs/liff/release-notes/)
- [Differences: LIFF browser vs external browser](https://developers.line.biz/en/docs/liff/differences-between-liff-browser-and-external-browser/)
- [Adding a LIFF app to your channel](https://developers.line.biz/en/docs/liff/registering-liff-apps/)
- [Minimizing LIFF browser](https://developers.line.biz/en/docs/liff/minimizing-liff-browser/)
