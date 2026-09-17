// Playwright의 테스트 프로세스는 Next.js와 달리 .env.local을 자동으로 읽지
// 않는다. Supabase REST API를 직접 호출하는 스펙(예: account-isolation)이
// NEXT_PUBLIC_SUPABASE_* 값을 쓸 수 있도록 여기서 직접 읽어 채워 넣는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvFile(path: string) {
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return;
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const root = process.cwd();
loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));
