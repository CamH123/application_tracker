import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
const key = (): Buffer => {
  const configured = process.env.TOKEN_ENCRYPTION_KEY;
  if (!configured || !/^[a-fA-F0-9]{64}$/.test(configured))
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters",
    );
  return Buffer.from(configured, "hex");
};
export const encryptToken = (token: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
};
export const decryptToken = (encrypted: string): string => {
  const [iv, tag, ciphertext] = encrypted
    .split(".")
    .map((part) => Buffer.from(part!, "base64url"));
  if (!iv || !tag || !ciphertext)
    throw new Error("Encrypted token is malformed");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
};
