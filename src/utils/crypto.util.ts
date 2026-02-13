import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const SALT_ROUNDS = 10;

const SPECIAL_CHARS = '!@#$%^&*';

/** Generates a temporary password that satisfies strength rules (8+ chars, 1 number, 1 special). */
export function generateTempPassword(): string {
  const length = 12;
  const num = crypto.randomInt(1, 10).toString();
  const special = SPECIAL_CHARS[crypto.randomInt(0, SPECIAL_CHARS.length)];
  const alphanumeric = crypto.randomBytes(length - 2).toString('base64').replace(/[+/=]/g, 'a').slice(0, length - 2);
  const combined = alphanumeric + num + special;
  return combined.split('').sort(() => crypto.randomInt(0, 2) - 1).join('');
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashedPassword);
};
