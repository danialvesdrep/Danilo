import bcrypt from "bcryptjs";

/** Custo 12: equilíbrio entre resistência a força bruta e latência de login. */
const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Regras mínimas de senha, aplicadas no cadastro e na redefinição. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "A senha precisa ter ao menos 10 caracteres.";
  if (!/[a-zA-Z]/.test(password)) return "A senha precisa conter letras.";
  if (!/[0-9]/.test(password)) return "A senha precisa conter ao menos um número.";
  return null;
}
