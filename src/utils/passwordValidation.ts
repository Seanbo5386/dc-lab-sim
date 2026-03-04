export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordRule {
  test: (pw: string) => boolean;
  message: string;
}

export const MIN_PASSWORD_LENGTH = 8;

export const passwordRules: PasswordRule[] = [
  {
    test: (pw) => pw.length >= MIN_PASSWORD_LENGTH,
    message: `At least ${MIN_PASSWORD_LENGTH} characters`,
  },
  { test: (pw) => /[A-Z]/.test(pw), message: "One uppercase letter" },
  { test: (pw) => /[a-z]/.test(pw), message: "One lowercase letter" },
  { test: (pw) => /[0-9]/.test(pw), message: "One number" },
  {
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
    message: "One special character",
  },
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors = passwordRules
    .filter((rule) => !rule.test(password))
    .map((rule) => rule.message);

  return { isValid: errors.length === 0, errors };
}
