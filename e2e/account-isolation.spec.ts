import { expect, test, type APIRequestContext } from "@playwright/test";
import "./support/load-env";
import { TEST_PASSWORD, uniqueUsername } from "./support/account";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

async function signUpViaApi(request: APIRequestContext, username: string) {
  const email = `${username}@users.amunote.internal`;
  const response = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    data: { email, password: TEST_PASSWORD, data: { username } },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return {
    accessToken: body.access_token as string,
    userId: body.user.id as string,
  };
}

test("다른 계정의 프로필은 다른 사용자와 로그인하지 않은 사람이 읽을 수 없다", async ({
  request,
}) => {
  test.skip(!SUPABASE_URL || !SUPABASE_KEY, "Supabase 환경 변수가 설정되어 있지 않다");

  const accountA = await signUpViaApi(request, uniqueUsername("isoa"));
  const accountB = await signUpViaApi(request, uniqueUsername("isob"));

  // 본인 토큰으로는 자신의 프로필을 읽을 수 있다
  const asSelf = await request.get(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${accountA.userId}`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accountA.accessToken}` } },
  );
  expect(await asSelf.json()).toHaveLength(1);

  // 다른 계정의 토큰으로는 읽을 수 없다
  const asOtherUser = await request.get(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${accountA.userId}`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accountB.accessToken}` } },
  );
  expect(await asOtherUser.json()).toEqual([]);

  // 로그인하지 않은 상태(anon)로는 읽을 수 없다
  const asAnon = await request.get(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${accountA.userId}`,
    { headers: { apikey: SUPABASE_KEY } },
  );
  expect(await asAnon.json()).toEqual([]);

  // 다른 계정의 토큰으로 값을 바꿀 수도 없다
  const updateAttempt = await request.patch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${accountA.userId}`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accountB.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: { username: uniqueUsername("hijack") },
    },
  );
  expect(await updateAttempt.json()).toEqual([]);
});
