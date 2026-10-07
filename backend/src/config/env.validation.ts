// Implicit conversion reads the decorator type metadata: load the polyfill
// here, so a script validating the environment without Nest works too.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

export enum LogFormat {
  JSON = 'json',
  PRETTY = 'pretty',
}

export enum LogLevel {
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

/** What a script needs (migrations): no HTTP, no secret it does not use. */
export class ScriptEnvironment {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.LOG;

  // Defaults to pretty in development, json elsewhere (see logSettings).
  @IsEnum(LogFormat)
  @IsOptional()
  LOG_FORMAT?: LogFormat;

  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgres:// connection string',
  })
  DATABASE_URL: string;
}

/**
 * Contract for the environment variables of the API, validated at startup.
 * Consumers inject a namespace (`appConfig`, `authConfig`...), not this class.
 */
export class EnvironmentVariables extends ScriptEnvironment {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  // Must stay 0.0.0.0 in a container, or the port is unreachable from outside.
  @IsString()
  @IsNotEmpty()
  HOST: string = '0.0.0.0';

  @IsString()
  @IsNotEmpty()
  API_PREFIX: string = 'api';

  // Digits only: URI versioning prepends the `v` itself.
  @Matches(/^\d+$/)
  API_DEFAULT_VERSION: string = '1';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '';

  // Signs the access tokens. At least 32 characters of randomness.
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsInt()
  @Min(1)
  @Max(60)
  ACCESS_TOKEN_TTL_MINUTES: number = 15;

  // Sliding: a mobile session expires this many days after its last refresh.
  @IsInt()
  @Min(1)
  @Max(365)
  MOBILE_SESSION_DAYS: number = 30;

  // Fixed: a back office session ends this many hours after the sign-in.
  @IsInt()
  @Min(1)
  @Max(24)
  BACKOFFICE_SESSION_HOURS: number = 12;

  // Encrypts the TOTP secrets: 32 random bytes, base64.
  @Matches(/^[A-Za-z0-9+/]{43}=$/, {
    message: 'TOTP_ENCRYPTION_KEY must be 32 bytes encoded in base64',
  })
  TOTP_ENCRYPTION_KEY: string;
}

/** `bootstrap` seed: the first super administrator. */
export class BootstrapSeedEnvironment extends ScriptEnvironment {
  @IsEmail()
  SEED_SUPER_ADMIN_EMAIL: string;

  @IsString()
  @MinLength(12)
  SEED_SUPER_ADMIN_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  SEED_SUPER_ADMIN_FIRST_NAME: string = 'Super';

  @IsString()
  @IsNotEmpty()
  SEED_SUPER_ADMIN_LAST_NAME: string = 'Admin';
}

/** `demo` seed: password shared by the demo responsable and intervenant. */
export class DemoSeedEnvironment extends ScriptEnvironment {
  @IsString()
  @MinLength(12)
  SEED_DEMO_PASSWORD: string;
}

function validate<T extends object>(
  target: new () => T,
  raw: Record<string, unknown>,
): T {
  const parsed = plainToInstance(target, raw, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const issues = validateSync(parsed, { skipMissingProperties: false }).map(
    (error) =>
      `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
  );

  if (issues.length > 0) {
    throw new Error(
      ['Invalid environment:', ...issues, '', 'See .env.example.'].join('\n'),
    );
  }

  return parsed;
}

let cached: EnvironmentVariables | undefined;

export function validateEnvironment(
  raw: Record<string, unknown>,
): EnvironmentVariables {
  cached = validate(EnvironmentVariables, raw);
  return cached;
}

export function validateScriptEnvironment(
  raw: Record<string, unknown>,
): ScriptEnvironment {
  return validate(ScriptEnvironment, raw);
}

export function validateBootstrapSeedEnvironment(
  raw: Record<string, unknown>,
): BootstrapSeedEnvironment {
  return validate(BootstrapSeedEnvironment, raw);
}

export function validateDemoSeedEnvironment(
  raw: Record<string, unknown>,
): DemoSeedEnvironment {
  return validate(DemoSeedEnvironment, raw);
}

export function logSettings(e: ScriptEnvironment): {
  logLevel: LogLevel;
  logFormat: LogFormat;
} {
  return {
    logLevel: e.LOG_LEVEL,
    logFormat:
      e.LOG_FORMAT ??
      (e.NODE_ENV === NodeEnv.DEVELOPMENT ? LogFormat.PRETTY : LogFormat.JSON),
  };
}

/** Validated environment, for the `registerAs` factories. */
export function env(): EnvironmentVariables {
  return cached ?? validateEnvironment(process.env);
}
