# Whitepaper-derived icons

The node app shares the wallet's SVG family and export checks. Its sidebar brand (mobile header when the sidebar is hidden), favicon and native launcher use the purple, one-center NodeIcon. Overview uses a neutral navigation icon; do not repeat the brand beside page titles. BRN and TRST retain their orange diamond forms with solid green and blue centers respectively.

See the [shared source, usage and regeneration notes](../../../wallet/docs/design/icons.md). The canonical components are identical in both repositories; run the wallet's export script before regenerating this app's native icons with `npm run tauri -- icon public/icons/node.svg --output src-tauri/icons-whitepaper`.
