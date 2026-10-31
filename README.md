# BURST Node Dashboard

Desktop dashboard for a BURST node: inspect peers, accounts, transactions,
governance and node activity. Built with React and Tauri. The node itself lives
in the [protocol repository](https://github.com/BURST-UBI/protocol).

## Development

Install Node.js, Rust and the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/).
Clone `protocol` and `node-gui` into the same parent directory; Rust dependencies
use relative paths to `../protocol`.

From `node-gui`:

```sh
npm ci
npm run tauri dev
```

Connect the dashboard to a running BURST node's RPC endpoint. `npm run dev`
starts only the web interface; native RPC commands require the Tauri app.

`src/` contains the interface, `src-tauri/` the desktop integration, and `tests/`
the app checks, including native WebView journeys.

[MIT license](LICENSE).
