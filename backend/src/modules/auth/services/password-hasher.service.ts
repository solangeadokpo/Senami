import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** argon2id, the library default. */
@Injectable()
export class PasswordHasherService {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }

  /**
   * Spends the time of a real verification, so that an unknown email cannot
   * be told apart from a wrong password by the response time.
   */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= hash('senami-timing-equaliser');
    await verify(await this.dummyHash, password);
  }
}
