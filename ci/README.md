# Protocol dependency

Native CI reads `ci/protocol-revision` and checks out that protocol commit beside
`node-gui`. Manual workflow runs may supply `protocol_revision` instead; the
workflow requires a full, lowercase 40-character commit SHA.

The preflight checks for `protocol/http_client/Cargo.toml` and runs Cargo metadata
on `src-tauri/Cargo.toml`. These are dependency checks, not a successful native
build. The job then tests the locked native library against the selected checkout.

See [application CI dependencies](https://github.com/BURST-UBI/protocol/blob/main/docs/development/DEVELOPING.md#application-ci-dependencies)
for updating pins and distinguishing local checks from CI evidence.
