# ChatLTR

ChatLTR is a small Chrome extension that fixes the direction of mixed Persian/Arabic (RTL) and English (LTR) text on ChatGPT. It automatically detects the dominant script in each message and isolates runs of the opposite direction so that conversations remain readable.

## Interesting techniques
- Uses the [`TreeWalker` API](https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker) in [content.js](./content.js) to traverse text nodes while skipping code, math and other excluded elements.
- Watches for new or edited messages with [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver), allowing real-time correction as ChatGPT renders content.
- Defers processing via [`requestIdleCallback`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) to reduce layout thrash.
- Wraps opposite-script segments in the [`bdi` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdi) and relies on the [`unicode-bidi` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi) to isolate direction.

## Non-obvious technologies
- Manifest V3 [service workers](https://developer.chrome.com/docs/extensions/mv3/service_workers/) in [service_worker.js](./service_worker.js) manage global settings and keyboard shortcuts.
- User preferences are persisted with [`chrome.storage.sync`](https://developer.chrome.com/docs/extensions/reference/storage/) and communicated to pages via [`chrome.runtime` messaging](https://developer.chrome.com/docs/extensions/mv3/messaging/).
- The extension can be toggled per-site or globally with a [`chrome.commands` shortcut](https://developer.chrome.com/docs/extensions/reference/commands/).

## External libraries and fonts
This project has no third-party dependencies and relies solely on browser APIs. The popup UI uses the generic [`sans-serif` font family](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family) defined in [popup.css](./popup.css).

## Project structure
```text
.
├── README.md
├── content.js
├── icons/
├── manifest.json
├── popup.css
├── popup.html
├── popup.js
├── service_worker.js
├── styles.css
```
- `icons/` &mdash; PNG assets in multiple sizes for the Chrome toolbar and extension store listings.
- Remaining files are top-level scripts, styles and markup for the extension's functionality and popup UI.

## Development
Load the folder as an unpacked extension in Chrome (Extensions &rarr; Developer mode &rarr; Load unpacked) to try it locally.
