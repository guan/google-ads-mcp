/**
 * Device Code Flow
 *
 * OAuth 2.0 Device Authorization Grant for CLI authentication.
 * Generates device codes, user codes, and manages access tokens.
 */

import crypto from 'crypto';

/**
 * Device code data structure
 */
export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresAt: Date;
  interval: number;
  status: 'pending' | 'authorized' | 'denied' | 'expired';
  userId?: string;
  email?: string;
  name?: string;
  createdAt: Date;
}

/**
 * Access token data structure
 */
export interface AccessTokenData {
  userId: string;
  email: string;
  name: string;
  expiresAt: Date;
  deviceCode?: string;
  createdAt: Date;
}

export interface UserData {
  id: string;
  email: string;
  name: string;
}

const DEVICE_CODE_EXPIRY_MS = 15 * 60 * 1000;
const ACCESS_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
const POLLING_INTERVAL_SECONDS = 5;
const USER_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateDeviceCode(): string {
  return crypto.randomUUID();
}

export function generateUserCode(): string {
  const chars: string[] = [];
  for (let i = 0; i < 8; i++) {
    chars.push(USER_CODE_CHARS[crypto.randomInt(USER_CODE_CHARS.length)]);
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}`;
}

export function generateAccessToken(): string {
  return `mcp_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * In-memory store for device codes
 */
export class DeviceCodeStore {
  private codes: Map<string, DeviceCode> = new Map();
  private userCodeIndex: Map<string, string> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  create(verificationUri: string): DeviceCode {
    const deviceCode = generateDeviceCode();
    let userCode = generateUserCode();
    while (this.userCodeIndex.has(userCode)) {
      userCode = generateUserCode();
    }

    const code: DeviceCode = {
      deviceCode,
      userCode,
      verificationUri,
      expiresAt: new Date(Date.now() + DEVICE_CODE_EXPIRY_MS),
      interval: POLLING_INTERVAL_SECONDS,
      status: 'pending',
      createdAt: new Date(),
    };

    this.codes.set(deviceCode, code);
    this.userCodeIndex.set(userCode, deviceCode);
    return code;
  }

  getByDeviceCode(deviceCode: string): DeviceCode | undefined {
    const code = this.codes.get(deviceCode);
    if (!code) return undefined;
    if (new Date() > code.expiresAt) {
      code.status = 'expired';
    }
    return code;
  }

  getByUserCode(userCode: string): DeviceCode | undefined {
    const deviceCode = this.userCodeIndex.get(userCode);
    if (!deviceCode) return undefined;
    return this.getByDeviceCode(deviceCode);
  }

  async authorize(deviceCode: string, userData: UserData): Promise<string> {
    const code = this.getByDeviceCode(deviceCode);
    if (!code) throw new Error('Invalid device code');
    if (code.status === 'expired') throw new Error('Device code has expired');
    if (code.status === 'authorized') throw new Error('Device code already used');

    code.status = 'authorized';
    code.userId = userData.id;
    code.email = userData.email;
    code.name = userData.name;

    const accessToken = generateAccessToken();
    const tokenData: AccessTokenData = {
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRY_MS),
      deviceCode,
      createdAt: new Date(),
    };

    if (global.accessTokenStore) {
      global.accessTokenStore.set(accessToken, tokenData);
    }

    return accessToken;
  }

  cleanup(): void {
    const now = new Date();
    for (const [deviceCode, code] of this.codes.entries()) {
      if (now > code.expiresAt || code.status === 'authorized') {
        this.codes.delete(deviceCode);
        this.userCodeIndex.delete(code.userCode);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.codes.clear();
    this.userCodeIndex.clear();
  }
}

/**
 * In-memory store for access tokens
 */
export class AccessTokenStore {
  private tokens: Map<string, AccessTokenData> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set(token: string, data: AccessTokenData): void {
    this.tokens.set(token, data);
  }

  validate(token: string): AccessTokenData | null {
    const data = this.tokens.get(token);
    if (!data) return null;
    if (new Date() > data.expiresAt) {
      this.tokens.delete(token);
      return null;
    }
    return data;
  }

  revoke(token: string): boolean {
    return this.tokens.delete(token);
  }

  cleanup(): void {
    const now = new Date();
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }

  getStats(): { total: number; active: number } {
    const now = new Date();
    let active = 0;
    for (const data of this.tokens.values()) {
      if (now <= data.expiresAt) active++;
    }
    return { total: this.tokens.size, active };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.tokens.clear();
  }
}

// Global declarations
declare global {
  var accessTokenStore: AccessTokenStore;
}
