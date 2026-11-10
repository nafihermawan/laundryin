// Force the test environment: some shells export NODE_ENV=production, which makes
// React resolve to its production build and breaks @testing-library/react (React.act).
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";

import "@testing-library/jest-dom";

// jsdom does not implement matchMedia (used by the reduced-motion checks).
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
