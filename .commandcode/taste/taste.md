# Taste

## UI & Design
- Prefers clean, mobile-first UI with no unnecessary decoration: no gradients, no emoji, simple stroke-style icons, semantic HTML (`<Link>`/`<a>` for navigation, `<button>` for actions, aria-label on icon buttons), touch targets ≥44px, and text contrast ≥4.5:1. Confidence: 0.6
- Wants new screens built on the existing shared design tokens and shared components rather than re-implementing look-alike markup — extract a component when the same UI appears in more than one place. Confidence: 0.65
- Rejects native browser dialogs for user feedback: explicitly forbids `alert()` and wants a global toast system (toast success/error with a retry action) instead. Confidence: 0.6

## Workflow
- Expects changes scoped narrowly to the request: when asking for UI/visual changes, existing data logic, auth, and API behavior must be preserved (only presentation, page structure, and routing change); when asking for a behavior/animation fix, the existing appearance and filter logic must be preserved. Explicitly calls out what must NOT change ("jangan ubah isi maupun format kartu nota") — even within the same page/component, only the named element moves and everything else is left untouched. Confidence: 0.7
- For mobile UI work, expects the result verified on real devices (iOS Safari & Android Chrome), not just devtools/headless. Confidence: 0.6
