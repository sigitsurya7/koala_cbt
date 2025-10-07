export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Koala CBT";
export const APP_SHORT = (process.env.NEXT_PUBLIC_APP_SHORT ?? APP_NAME?.[0] ?? "K").toUpperCase();
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";