// Minimal analytics stub: no external deps.
// Safe to ship without installing any packages.
// If you later add the PostHog snippet to index.html, this will use it automatically.

type Props = Record<string, any> | undefined;

export function trackOutreachEvent(name: string, props?: Props) {
  // If a global posthog snippet exists, use it; otherwise no-op.
  const w = window as any;
  const ph = w && w.posthog;
  if (ph && typeof ph.capture === "function") {
    ph.capture(name, props || {});
  }
}
