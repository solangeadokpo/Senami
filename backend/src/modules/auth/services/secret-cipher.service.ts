import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type AuthConfig, authConfig } from '@config/index.js';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/** AES-256-GCM. Stored layout: nonce (12) | tag (16) | ciphertext. */
@Injectable()
export class SecretCipherService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: Pick<AuthConfig, 'totpEncryptionKey'>,
  ) {}

  encrypt(plaintext: string): Buffer {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(
      ALGORITHM,
      this.config.totpEncryptionKey,
      nonce,
    );
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
  }

  /** Throws on a tampered value or a wrong key (GCM authentication). */
  decrypt(stored: Buffer): string {
    const nonce = stored.subarray(0, NONCE_BYTES);
    const tag = stored.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES);
    const ciphertext = stored.subarray(NONCE_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(
      ALGORITHM,
      this.config.totpEncryptionKey,
      nonce,
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
