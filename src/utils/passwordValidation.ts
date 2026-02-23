export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

const rules: { test: (pw: string) => boolean; message: string }[] = [
  { test: (pw) => pw.length >= 8, message: "At least 8 characters" },
  { test: (pw) => /[A-Z]/.test(pw), message: "One uppercase letter" },
  { test: (pw) => /[a-z]/.test(pw), message: "One lowercase letter" },
  { test: (pw) => /[0-9]/.test(pw), message: "One number" },
  {
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
    message: "One special character",
  },
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors = rules
    .filter((rule) => !rule.test(password))
    .map((rule) => rule.message);

  return { isValid: errors.length === 0, errors };
}
