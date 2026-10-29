import type { NextConfig } from "next";

// 서버에서 보내는 조회도 가로채는 별도 e2e 서버에서만 켠다.
const readTests = process.env.NEXT_TEST_PROXY === "1" && process.env.NODE_ENV !== "production";
const nextConfig: NextConfig = readTests
  ? { distDir: ".next-test-proxy", experimental: { testProxy: true } }
  : {};

export default nextConfig;
