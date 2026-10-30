import type { Locator, Page } from "@playwright/test";

export async function chooseDocColor(page: Page, label: string, value: string, touch = false) {
  const activate = (target: Locator) => touch ? target.tap() : target.click();
  await activate(page.getByRole("button", { name: label, exact: true }));
  const picker = page.getByRole("dialog", { name: label, exact: true });
  await picker.getByLabel("색상 선택", { exact: true }).fill(value);
  await activate(picker.getByRole("button", { name: "적용", exact: true }));
}
