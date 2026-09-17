import { defineConfig, devices } from "@playwright/test";
import "./e2e/support/load-env";

const baseURL = "http://localhost:3000";

// 브라우저가 이미 설치된 환경(예: Claude Code 원격 세션)에서는
// PLAYWRIGHT_CHROMIUM_PATH로 실행 파일을 직접 지정한다.
// 로컬에서는 비워 두고 `bunx playwright install chromium`으로 내려받는다.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  // 자동 저장이 2초 기다린 뒤 Supabase Cloud까지 다녀오므로, 한 흐름에서 노트를
  // 여러 번 저장하는 테스트는 기본 30초로는 빠듯하다.
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 표시 언어는 브라우저 언어를 따른다(태스크 07). 스펙 대부분이 한국어
        // 문구로 화면을 찾으므로 기본을 한국어로 둔다. 언어 자체를 확인하는
        // e2e/language.spec.ts는 필요한 언어로 context를 직접 연다.
        locale: "ko-KR",
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
