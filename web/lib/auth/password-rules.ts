export type PasswordRule = {
  id: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", test: (p) => p.length >= 8 },
  { id: "uppercase", test: (p) => /[A-Z]/.test(p) },
  { id: "lowercase", test: (p) => /[a-z]/.test(p) },
  { id: "number", test: (p) => /[0-9]/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}