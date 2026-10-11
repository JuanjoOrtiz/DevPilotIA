import { z } from 'zod';
import { fieldError } from './validation.js';

export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt solo tiene en cuenta los primeros 72 bytes de una contraseña. */
export const PASSWORD_MAX_BYTES = 72;

/**
 * Bytes que ocupa un texto en UTF-8. Se calcula a mano para que este paquete no dependa
 * de las API del navegador ni de las de Node.
 */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
  }
  return bytes;
}

const emailSchema = z
  .string(fieldError('EMAIL_INVALID'))
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, fieldError('EMAIL_INVALID'))
  .pipe(z.email(fieldError('EMAIL_INVALID')));

/** Cuerpo de `POST /auth/register`. */
export const registerRequestSchema = z.object({
  name: z
    .string(fieldError('NAME_REQUIRED'))
    .trim()
    .min(1, fieldError('NAME_REQUIRED'))
    .max(NAME_MAX_LENGTH, fieldError('NAME_TOO_LONG')),
  email: emailSchema,
  password: z
    .string(fieldError('PASSWORD_REQUIRED'))
    .min(PASSWORD_MIN_LENGTH, fieldError('PASSWORD_TOO_SHORT'))
    .refine(
      (password) => utf8ByteLength(password) <= PASSWORD_MAX_BYTES,
      fieldError('PASSWORD_TOO_LONG'),
    ),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/**
 * Cuerpo de `POST /auth/login`. No repite las reglas del registro: una contraseña que no
 * las cumple es, sencillamente, una credencial incorrecta.
 */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string(fieldError('PASSWORD_REQUIRED')).min(1, fieldError('PASSWORD_REQUIRED')),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** El usuario tal y como lo ve el frontend: nunca incluye el hash de la contraseña. */
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;

/**
 * Respuesta de registro, login y refresh. El access token va en el cuerpo y vive solo en
 * la memoria del navegador; el refresh token viaja aparte, en una cookie httpOnly.
 */
export const sessionResponseSchema = z.object({
  accessToken: z.string().min(1),
  /** Segundos de validez del access token. */
  expiresIn: z.number().int().positive(),
  user: userSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/** Respuesta de `GET /auth/me`. */
export const currentUserResponseSchema = z.object({ user: userSchema });
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
