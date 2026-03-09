export const DEMO_EMAILS = ["c74661985@gmail.com"];

export function isDemoAccount(email: string | undefined | null): boolean {
  if (!email) return false;
  return DEMO_EMAILS.includes(email.toLowerCase());
}
