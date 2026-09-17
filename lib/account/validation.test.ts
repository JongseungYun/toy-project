import { describe, expect, test } from "vitest";
import {
  checkPasswordRules,
  isPasswordValid,
  isValidUsername,
  usernameToInternalEmail,
} from "@/lib/account/validation";

describe("isValidUsername", () => {
  test("영문 소문자와 숫자 4-20자는 통과한다", () => {
    expect(isValidUsername("yunjs")).toBe(true);
    expect(isValidUsername("ab12")).toBe(true);
    expect(isValidUsername("a".repeat(20))).toBe(true);
  });

  test("규칙에 어긋나면 통과하지 못한다", () => {
    expect(isValidUsername("abc")).toBe(false); // 4자 미만
    expect(isValidUsername("a".repeat(21))).toBe(false); // 20자 초과
    expect(isValidUsername("Yunjs1")).toBe(false); // 대문자 포함
    expect(isValidUsername("yun js")).toBe(false); // 공백
    expect(isValidUsername("yun_js")).toBe(false); // 기호
  });
});

describe("checkPasswordRules / isPasswordValid", () => {
  test("네 조건을 모두 만족하면 유효하다", () => {
    const rules = checkPasswordRules("Gureum2026!");
    expect(rules).toEqual({
      minLength: true,
      hasUpperAndLower: true,
      hasNumber: true,
      hasSymbol: true,
    });
    expect(isPasswordValid("Gureum2026!")).toBe(true);
  });

  test("숫자와 기호가 빠지면 그 항목만 실패로 표시된다", () => {
    const rules = checkPasswordRules("Gureumabc");
    expect(rules.minLength).toBe(true);
    expect(rules.hasUpperAndLower).toBe(true);
    expect(rules.hasNumber).toBe(false);
    expect(rules.hasSymbol).toBe(false);
    expect(isPasswordValid("Gureumabc")).toBe(false);
  });

  test("8자 미만이면 길이 조건이 실패한다", () => {
    expect(checkPasswordRules("Ab1!").minLength).toBe(false);
    expect(isPasswordValid("Ab1!")).toBe(false);
  });
});

describe("usernameToInternalEmail", () => {
  test("같은 아이디는 항상 같은 내부 이메일로 변환된다", () => {
    expect(usernameToInternalEmail("yunjs")).toBe(usernameToInternalEmail("yunjs"));
  });

  test("다른 아이디는 다른 내부 이메일로 변환된다", () => {
    expect(usernameToInternalEmail("yunjs")).not.toBe(usernameToInternalEmail("other"));
  });

  test("사용자에게 실제로 보내지 않을 내부 전용 도메인을 쓴다", () => {
    expect(usernameToInternalEmail("yunjs")).toBe("yunjs@users.amunote.internal");
  });
});
