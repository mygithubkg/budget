import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM recommended

function getEncryptionKey(customSecret?: string): Buffer {
  const secret =
    customSecret ||
    process.env.API_KEY_ENCRYPTION_SECRET ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    "finchat-secret-encryption-key-ledger-2026-secure-32";

  // Derive a guaranteed 32-byte (256-bit) key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedPayload {
  encryptedKey: string; // hex
  iv: string; // hex
  authTag: string; // hex
}

/**
 * Encrypt a plaintext string using AES-256-GCM (returns structured payload)
 */
export function encryptSecret(plainText: string, customSecret?: string): EncryptedPayload {
  if (!plainText) {
    throw new Error("Cannot encrypt empty plainText");
  }

  const key = getEncryptionKey(customSecret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedKey: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

/**
 * Decrypt an AES-256-GCM encrypted string from structured payload
 */
export function decryptSecret(
  encryptedKey: string,
  ivHex: string,
  authTagHex: string,
  customSecret?: string
): string {
  if (!encryptedKey || !ivHex || !authTagHex) {
    throw new Error("Missing parameters for decryption");
  }

  const key = getEncryptionKey(customSecret);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt API key returning a single colon-separated string: iv:ciphertext:tag
 */
export function encryptApiKey(plainText: string, customSecret?: string): string {
  const { iv, encryptedKey, authTag } = encryptSecret(plainText, customSecret);
  return `${iv}:${encryptedKey}:${authTag}`;
}

/**
 * Decrypt API key from a single colon-separated string: iv:ciphertext:tag
 */
export function decryptApiKey(encryptedString: string, customSecret?: string): string {
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  const [ivHex, ciphertextHex, authTagHex] = parts;
  return decryptSecret(ciphertextHex, ivHex, authTagHex, customSecret);
}

/**
 * Mask an API key to reveal only the last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey) return "";
  if (apiKey.length <= 4) return apiKey;
  return apiKey.slice(-4);
}
