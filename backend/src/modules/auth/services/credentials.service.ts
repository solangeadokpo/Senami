import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '@modules/auth/auth.errors.js';
import {
  type Account,
  AUTH_REPOSITORY,
  type AuthRepository,
} from '@modules/auth/repositories/auth.repository.js';
import { PasswordHasherService } from './password-hasher.service.js';

/** The password step, shared by the mobile and back office sign-ins. */
@Injectable()
export class CredentialsService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    private readonly passwords: PasswordHasherService,
  ) {}

  /**
   * An unknown email costs the time of a real verification and gives the
   * same error as a wrong password: neither reveals that an account exists.
   */
  async verify(email: string, password: string): Promise<Account> {
    const account = await this.repository.findAccountByEmail(email);
    if (account === undefined || account.passwordHash === null) {
      await this.passwords.verifyAgainstDummy(password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.passwords.verify(account.passwordHash, password))) {
      throw new InvalidCredentialsError();
    }
    const { passwordHash: _passwordHash, ...rest } = account;
    return rest;
  }
}
