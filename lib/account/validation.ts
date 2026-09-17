// 계정 식별자 규칙: docs/decisions/account-identity.md, 프로토타입의 "영문 소문자와 숫자 4-20자" 안내를 따른다.

const USERNAME_PATTERN = /^[a-z0-9]{4,20}$/;

const INTERNAL_EMAIL_DOMAIN = "users.amunote.internal";

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export interface PasswordRules {
  minLength: boolean;
  hasUpperAndLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export function checkPasswordRules(password: string): PasswordRules {
  return {
    minLength: password.length >= 8,
    hasUpperAndLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const rules = checkPasswordRules(password);
  return (
    rules.minLength &&
    rules.hasUpperAndLower &&
    rules.hasNumber &&
    rules.hasSymbol
  );
}

// Supabase Auth는 이메일/전화번호만 식별자로 받는다. 아이디를 그대로 쓰기 위해
// 사용자에게 보이지 않는 내부 전용 이메일로 변환한다. account-identity.md 참고.
export function usernameToInternalEmail(username: string): string {
  return `${username}@${INTERNAL_EMAIL_DOMAIN}`;
}
