import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/encryption";

describe("Encryption & Key Management (AES-256-GCM)", () => {
  const testSecret = "super-secret-key-for-testing-purposes-12345";
  const rawApiKey = "gsk_1234567890abcdefghijklmnopqrstuvwxyz";

  test("correctly encrypts and decrypts an API key", () => {
    const encrypted = encryptApiKey(rawApiKey, testSecret);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(rawApiKey);
    expect(encrypted.split(":")).toHaveLength(3); // iv:ciphertext:tag

    const decrypted = decryptApiKey(encrypted, testSecret);
    expect(decrypted).toEqual(rawApiKey);
  });

  test("produces unique ciphertexts and IVs for identical plaintexts (non-deterministic nonce)", () => {
    const enc1 = encryptApiKey(rawApiKey, testSecret);
    const enc2 = encryptApiKey(rawApiKey, testSecret);
    expect(enc1).not.toEqual(enc2);

    expect(decryptApiKey(enc1, testSecret)).toEqual(rawApiKey);
    expect(decryptApiKey(enc2, testSecret)).toEqual(rawApiKey);
  });

  test("fails decryption with incorrect secret key", () => {
    const encrypted = encryptApiKey(rawApiKey, testSecret);
    expect(() => {
      decryptApiKey(encrypted, "wrong-secret-key-1234567890");
    }).toThrow();
  });

  test("fails decryption with malformed ciphertext", () => {
    expect(() => {
      decryptApiKey("malformed:string", testSecret);
    }).toThrow("Invalid encrypted text format");
  });

  test("masks API keys properly with last 4 characters", () => {
    expect(maskApiKey("gsk_1234567890abcdef")).toEqual("cdef");
    expect(maskApiKey("1234")).toEqual("1234");
    expect(maskApiKey("ab")).toEqual("ab");
  });
});
