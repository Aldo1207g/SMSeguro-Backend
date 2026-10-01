import { createHmac } from 'node:crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('JWT_SECRET no está configurado en el archivo .env');
}

export interface JwtPayload {
  sub: number;
  email: string;
  rol: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function b64url(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function hmac(data: string): string {
  if (!SECRET) {
    throw new Error('JWT_SECRET no está configurado en el archivo .env');
  }

  return createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');
}

export function sign(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  ttlSeconds: number,
): string {
  const header = b64url({
    alg: 'HS256',
    typ: 'JWT',
  });

  const body = b64url({
    ...payload,
    iat: now(),
    exp: now() + ttlSeconds,
  });

  const signature = hmac(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function verify(token: string): JwtPayload | null {
  const [header, body, signature] = token.split('.');

  if (!header || !body || !signature) {
    return null;
  }

  if (hmac(`${header}.${body}`) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as JwtPayload;

    if (payload.exp < now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}