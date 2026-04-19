import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ENCRYPTION_KEY = process.env.MY_GARAGE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || "default-encryption-key-32-bytes-long!";
const KEY = createHash("sha256").update(ENCRYPTION_KEY).digest();
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // AES GCM standard

function encodeBase64(input: Buffer): string {
  return input.toString("base64");
}

function decodeBase64(input: string): Buffer {
  return Buffer.from(input, "base64");
}

export function encrypt(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${encodeBase64(iv)}:${encodeBase64(encrypted)}:${encodeBase64(authTag)}`;
}

export function decrypt(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parts = value.split(":");
  if (parts.length !== 3) {
    return value;
  }

  try {
    const iv = decodeBase64(parts[0]);
    const encrypted = decodeBase64(parts[1]);
    const authTag = decodeBase64(parts[2]);

    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed:", error);
    return value;
  }
}
