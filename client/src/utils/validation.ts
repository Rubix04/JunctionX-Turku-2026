// Simple checks for sign-in and sign-up forms. The server checks again.

export const MIN_PASSWORD_LENGTH = 8;

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
