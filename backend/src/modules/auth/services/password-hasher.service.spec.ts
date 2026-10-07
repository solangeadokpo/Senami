import { PasswordHasherService } from './password-hasher.service.js';

describe('PasswordHasherService', () => {
  const hasher = new PasswordHasherService();
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hasher.hash('correct horse battery staple');
  });

  it('hashes with argon2id', () => {
    expect(passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('verifies the right password', async () => {
    expect(
      await hasher.verify(passwordHash, 'correct horse battery staple'),
    ).toBe(true);
  });

  it('rejects a wrong password', async () => {
    expect(await hasher.verify(passwordHash, 'wrong')).toBe(false);
  });

  it('spends a verification for an unknown account', async () => {
    await expect(
      hasher.verifyAgainstDummy('anything'),
    ).resolves.toBeUndefined();
  });
});
