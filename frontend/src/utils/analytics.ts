// src/utils/analytics.ts
import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY;
if (key) {
  posthog.init(key, { api_host: 'https://app.posthog.com' });
}

export function trackOutreachEvent(name: string, props?: Record<string, any>) {
  if (!key) return;
  posthog.capture(name, props || {});
}
