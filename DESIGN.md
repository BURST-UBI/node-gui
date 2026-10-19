# Burst interface

Quiet, practical consumer software. Separate everyday actions from network administration, and keep the protocol's meaning intact. Design authority is the implemented system in `src/app.css` and `src/components`, not a new library.

The node application is for operators. Keep peers, synchronization, consensus, parameters, ledger inspection and logs accessible. It shares visual foundations with the wallet, not the wallet's consumer information hierarchy. The wallet prioritizes balances, payments and personal verification.

- [Tokens and layout](docs/design/tokens.md)
- [Components and interaction](docs/design/components.md)
- [Wallet product model and source differences](../wallet/docs/design/product-model.md)

Use semantic tokens, not raw colors or new palette names. Keep existing Radix primitives and Lucide action icons. Brand and token symbols use the whitepaper-derived SVG family in `src/components/burst-icons.tsx`; its fixed brand palette is separate from semantic status colors. Do not install a second UI kit for a new screen.

## Consistent information patterns

Use MetricGroup / MetricItem for node summary values and ContextHelp for supplemental explanations. Related values share typography, row geometry and separator treatment; do not mix divided tiles, flat diagnostic rules and colored counters for the same category. Charts and actual warnings have different roles and may differ. See the component and token docs for the contract.

## Product invariants

- BRN is personal income, not transferable. A payment burns BRN to create TRST for someone else. Never combine BRN and TRST into one total.
- Active, expired, and revoked TRST are distinct. Keep origins and expiry accessible; expired TRST remains visible as virtue points.
- The governance-defined expiry period can change transferability of existing TRST. Do not treat expiry as fraud revocation or erase expired records.
- Consensus and governance represent verified humans, not token holdings. Never format raw consensus weight as token amounts.
- Account-history `amount` is the post-block TRST balance, not the transaction delta. Account is the owner, not necessarily a counterparty. Native history is ascending: use neutral pagination labels.
- Unknown is not zero. Failed reads need an explicit error and a recovery action. Preserve known values during background refresh without concealing failures.
- Never move warnings, irreversibility, backup requirements, or testnet/mainnet identity into a tooltip.
- Keep confirmation before signing. Do not unlock a wallet from persisted UI state or dismiss pending payment confirmations.

## Changes

Check desktop and 320px touch layouts, both themes, keyboard navigation, reduced motion, error/empty/full states, and confirmation cancellation. Use synthetic IPC fixtures for automated UI tests. Do not label those tests native ledger E2E.
