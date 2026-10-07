import { TEST_AUTH_CONFIG } from '@modules/auth/testing/auth-fixtures.js';
import { SecretCipherService } from './secret-cipher.service.js';

describe('SecretCipherService', () => {
  const cipher = new SecretCipherService(TEST_AUTH_CONFIG);

  it('decrypts what it encrypted', () => {
    expect(cipher.decrypt(cipher.encrypt('JBSWY3DPEHPK3PXP'))).toBe(
      'JBSWY3DPEHPK3PXP',
    );
  });

  it('never stores the secret in clear and never twice the same', () => {
    const first = cipher.encrypt('JBSWY3DPEHPK3PXP');
    const second = cipher.encrypt('JBSWY3DPEHPK3PXP');

    expect(first.toString('utf8')).not.toContain('JBSWY3DPEHPK3PXP');
    expect(first.equals(second)).toBe(false);
  });

  it('refuses a tampered value', () => {
    const stored = cipher.encrypt('JBSWY3DPEHPK3PXP');
    stored.writeUInt8(
      stored.readUInt8(stored.length - 1) ^ 0xff,
      stored.length - 1,
    );

    expect(() => cipher.decrypt(stored)).toThrow();
  });

  it('refuses a value encrypted with another key', () => {
    const other = new SecretCipherService({
      totpEncryptionKey: Buffer.alloc(32, 9),
    });

    expect(() => cipher.decrypt(other.encrypt('JBSWY3DPEHPK3PXP'))).toThrow();
  });
});
