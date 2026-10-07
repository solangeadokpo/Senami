import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { type AuthConfig, authConfig } from '@config/index.js';
import { AuditModule } from '@modules/audit/audit.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { ChannelsGuard } from './guards/channels.guard.js';
import { AuthGuard } from './guards/auth.guard.js';
import { AUTH_REPOSITORY } from './repositories/auth.repository.js';
import { DrizzleAuthRepository } from './repositories/auth.repository.drizzle.js';
import { AuthService } from './services/auth.service.js';
import { LoginThrottlerGuard } from './guards/login-throttler.guard.js';
import { PasswordHasherService } from './services/password-hasher.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { SessionsController } from './controllers/sessions.controller.js';
import { SessionsService } from './services/sessions.service.js';
import { TokenService } from './services/token.service.js';

@Module({
  imports: [
    AuditModule,
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (config: AuthConfig) => ({
        secret: config.jwtSecret,
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    // In memory: enough for one instance, a shared store before scaling out.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AuthController, SessionsController],
  providers: [
    AuthService,
    SessionsService,
    TokenService,
    PasswordHasherService,
    LoginThrottlerGuard,
    { provide: AUTH_REPOSITORY, useClass: DrizzleAuthRepository },
    // Order matters: authentication first, then the role and channel checks.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ChannelsGuard },
  ],
  exports: [PasswordHasherService],
})
export class AuthModule {}
