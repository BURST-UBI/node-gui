# Tokens and layout

Source: [app.css](../../src/app.css). Both apps share these semantic roles.

## Type

System font stack; weight 400. Named rem scale: `text-caption` 13px, `text-ui` 14px, `text-heading` 18px, `text-title` 24px, `text-balance` 36px at the default root size. Inputs, selects, and textareas are 16px in both desktop and touch layouts; single-line fields are 44px tall with 8px corners. Never shrink text to fit; wrap or restructure.

Use tabular numerals for balances and metrics. Use monospace only for addresses, hashes, code, and exact raw units. Truncated identifiers need full selectable content in a details view, not only a hover title.

## Color

Use semantic `--color-*` tokens. The neutral palette is OKLCH; success, warning, and destructive colors retain their established semantic scales. Dark mode overrides roles, not individual screen values.

Background choice:

- App canvas → `background`.
- Content group or dialog → `card` / `popover`.
- Secondary grouping → `secondary` / `muted`.
- Selected or hovered navigation → `accent`.

Text choice:

- Essential information → `foreground`.
- Supporting copy → `muted-foreground`.
- Risk/failure → `warning` / `destructive`, with explicit wording.
- Confirmed success → `success`, with explicit wording.

Decorative separators use `border`. Inputs use `input`, tested at 3:1 against the canvas. Text pairs need 4.5:1 in each theme. Keep default border styling in the base cascade layer so semantic utility colors can override it.

## Layout

Use 4px spacing increments, primarily 8/12/16/24/32. Desktop sidebar is 208px, 184px on narrower desktops; below 760px use the four-item labeled bottom navigation and More dialog. Main content scrolls independently, with safe-area padding and a 100dvh shell.

Cards and balance panels share `--radius-card` (16px) and `--shadow-card`; both wallet balances have the same surface. Use 24px padding for content cards; metric rows have a 52px minimum height and 16px horizontal insets. Do not add a solid border or hover lift to a static card. Group with space before adding another card. Expanded balance details must not stretch the adjacent panel. Use one alignment rail for headings, form labels, and content.

Use `MetricGroup` / `MetricItem` for summaries on Overview, Peers, Verification and TRST origins. Default rows use a 52px minimum height, 16px horizontal insets, neutral tabular values and matching separators between entries. Remove column separators in a single-column layout. Never use equal-weight label/value text as an undifferentiated sentence or spread pairs to opposite edges.

Overview distinguishes the quick read from secondary inspection. Its four primary metrics have muted 14px labels above 24px values, with a 6px gap, 96px minimum height and column dividers. At 600px container width they become a divided two-by-two grid. Keep exactly two lines per reading, not a third line of metadata. Network details use a keyboard-operable disclosure and a single-column list capped at 640px, with aligned label/value rails. Clock, version, BRN rate and active TRST remain available there. Token symbols stay 28px. Parameter failures, missing/poor clock synchronization, and nonzero expired/revoked TRST remain visible outside the closed disclosure.

Charts are a different content type and may use their own surface. The activity plot is 96px high in loading and populated states. Account verification counts remain accessible through Accounts help. Use `ContextHelp` for supplemental explanations: an unboxed native disclosure with a 44px summary target. Never turn this background help into a left-bordered alert banner. Real errors, isolation warnings, network identity and irreversible-action risks remain visible.

## Motion

No decorative entry animations, scrolling reveals, pulsing metrics, or theme tweening. State changes are immediate. Keep essential spinner feedback; reduced motion pauses rotation. Never animate width/height, and never add `transition-all`. Logs only jump on explicit request. Do not pause protocol clocks or wallet automation as an animation optimization.
