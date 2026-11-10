// Force the test environment: some shells export NODE_ENV=production, which makes
// React resolve to its production build and breaks @testing-library/react (React.act).
const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "test";

import "@testing-library/jest-dom";
