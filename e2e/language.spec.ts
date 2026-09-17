import { expect, test, type Page } from "@playwright/test";
import { TEST_PASSWORD, signUpAndEnter, uniqueUsername } from "./support/account";

const SAVED = { timeout: 20_000 };

const CODES: Record<string, string> = {
  English: "en",
  "Français": "fr",
  Deutsch: "de",
  Italiano: "it",
  "Español": "es",
  "简体中文": "zh-Hans",
  "繁體中文": "zh-Hant",
  "日本語": "ja",
  "한국어": "ko",
};

/** 설정에서 표시 언어를 고른다. 고른 값은 계정에 저장된다. */
async function pickLanguage(page: Page, label: string) {
  await page.goto("/settings");
  await page.getByTestId("language-select").selectOption({ label });
}

test("브라우저 언어를 따라 시작하고, 지원하지 않는 언어면 영어로 시작한다", async ({
  browser,
}) => {
  // 독일어 브라우저
  const german = await browser.newContext({ locale: "de-DE" });
  const germanPage = await german.newPage();
  await germanPage.goto("/login");
  await expect(germanPage.getByText("Bei Amu Note anmelden")).toBeVisible();
  await expect(germanPage.locator("html")).toHaveAttribute("lang", "de");
  await german.close();

  // 일본어 브라우저
  const japanese = await browser.newContext({ locale: "ja-JP" });
  const japanesePage = await japanese.newPage();
  await japanesePage.goto("/login");
  await expect(japanesePage.getByText("アムノートにログイン")).toBeVisible();
  await japanese.close();

  // 번체를 쓰는 지역
  const taiwan = await browser.newContext({ locale: "zh-TW" });
  const taiwanPage = await taiwan.newPage();
  await taiwanPage.goto("/login");
  await expect(taiwanPage.getByText("登入阿木筆記")).toBeVisible();
  await taiwan.close();

  // 지원하지 않는 언어(포르투갈어)는 영어로 시작한다
  const portuguese = await browser.newContext({ locale: "pt-BR" });
  const portuguesePage = await portuguese.newPage();
  await portuguesePage.goto("/login");
  await expect(portuguesePage.getByText("Sign in to Amu Note")).toBeVisible();
  await expect(portuguesePage.locator("html")).toHaveAttribute("lang", "en");
  await portuguese.close();
});

test("설정에서 바꾼 언어가 계정에 저장되어 다른 기기에서도 그대로 나온다", async ({
  browser,
}) => {
  const first = await browser.newContext({ locale: "ko-KR" });
  const deviceA = await first.newPage();
  const username = await signUpAndEnter(deviceA);

  // 브라우저 언어를 따라 한국어로 시작한다
  await expect(deviceA.getByText("첫 노트를 만들어 보세요")).toBeVisible();

  await pickLanguage(deviceA, "Deutsch");
  await expect(deviceA.getByRole("heading", { name: "Einstellungen" })).toBeVisible(
    SAVED,
  );

  // 두 번째 기기. 로그인 전에는 누구인지 모르므로 로그인 화면은 브라우저 언어를
  // 따르고, 들어온 뒤에야 계정에 저장된 언어로 바뀐다.
  const second = await browser.newContext({ locale: "ko-KR" });
  const deviceB = await second.newPage();
  await deviceB.goto("/login");
  await expect(deviceB.getByText("아무노트에 로그인")).toBeVisible();
  await deviceB.getByLabel("아이디").fill(username);
  await deviceB.getByLabel("비밀번호").fill(TEST_PASSWORD);
  await deviceB.getByRole("button", { name: "로그인" }).click();
  await deviceB.waitForURL("/");
  await expect(deviceB.getByText("Schreiben Sie Ihre erste Notiz")).toBeVisible();
  await expect(deviceB.locator("html")).toHaveAttribute("lang", "de");

  await first.close();
  await second.close();
});

test("언어를 바꿔도 노트 제목과 본문은 그대로 남는다", async ({ browser }) => {
  const context = await browser.newContext({ locale: "ko-KR" });
  const page = await context.newPage();
  await signUpAndEnter(page);

  await page.getByRole("button", { name: "새 노트 만들기" }).first().click();
  await page.getByRole("button", { name: "일반 문서" }).click();
  await page.waitForURL(/\/notes\//);
  await page.getByLabel("노트 제목").fill("제주 3박 4일");
  await page.getByTestId("note-body").click();
  await page.keyboard.type("성산 일출봉과 한라산 둘레길");
  await expect(
    page.getByTestId("note-item").filter({ hasText: "제주 3박 4일" }).first(),
  ).toBeVisible(SAVED);
  const noteUrl = page.url();

  await pickLanguage(page, "简体中文");
  await expect(page.getByRole("heading", { name: "设置" })).toBeVisible(SAVED);

  // 화면 문구는 중국어로 바뀌었지만 노트는 내가 쓴 그대로다
  await page.goto(noteUrl);
  await expect(page.getByLabel("笔记标题")).toHaveValue("제주 3박 4일");
  await expect(page.getByTestId("note-body")).toContainText("성산 일출봉과 한라산 둘레길");
  await expect(page.getByTestId("note-item").first()).toContainText("제주 3박 4일");

  await context.close();
});

test("아홉 개 언어 모두에서 화면 문구가 잘리거나 넘치지 않는다", async ({ browser }) => {
  const context = await browser.newContext({ locale: "ko-KR" });
  const page = await context.newPage();
  await signUpAndEnter(page);

  const languages = [
    "English",
    "Français",
    "Deutsch",
    "Italiano",
    "Español",
    "简体中文",
    "繁體中文",
    "日本語",
    "한국어",
  ];

  for (const language of languages) {
    await pickLanguage(page, language);
    // 고른 값이 화면에 반영될 때까지 기다린다
    await expect(page.getByTestId("language-select")).toHaveValue(
      CODES[language],
      SAVED,
    );

    for (const path of ["/", "/settings", "/trash"]) {
      await page.goto(path);
      // 가로 스크롤이 생기면 문구가 화면 밖으로 넘친 것이다
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${language} ${path}에서 가로로 넘쳤다`).toBe(false);

      // 글자가 제 칸을 넘어 잘리는지 본다
      const clipped = await page.evaluate(() => {
        const spots = [...document.querySelectorAll("button, p, h1, h2, label, span")];
        return spots
          .filter((node) => {
            const style = getComputedStyle(node);
            if (style.overflow === "hidden" || style.textOverflow === "ellipsis") {
              // 줄임표로 처리하기로 한 자리는 넘쳐도 괜찮다
              return false;
            }
            return node.scrollWidth > node.clientWidth + 1 && node.clientWidth > 0;
          })
          .map((node) => node.textContent?.slice(0, 40) ?? "");
      });
      expect(clipped, `${language} ${path}에서 잘린 문구`).toEqual([]);
    }
  }

  await context.close();
});

test("설정에서 앱 정보를 볼 수 있다", async ({ browser }) => {
  const context = await browser.newContext({ locale: "ko-KR" });
  const page = await context.newPage();
  await signUpAndEnter(page, uniqueUsername("about"));

  await page.goto("/settings");
  await expect(page.getByText("앱 정보")).toBeVisible();
  await expect(page.getByText(/버전 0\.1\.0/)).toBeVisible();

  await context.close();
});
