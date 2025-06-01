import crypto from "node:crypto";

export const ENCRYPTION_ALGORITHM = "aes-256-cbc";

export function generateKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(data: Buffer, secret: string): string {
  const key = generateKey(secret);

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(key),
    iv,
  );
  let encrypted = cipher.update(data, null, "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + encrypted;
}

export function decrypt(data: string, secret: string): Buffer {
  const key = generateKey(secret);

  const iv = data.slice(0, 32);
  const encrypted = data.slice(32);
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
  );
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}
