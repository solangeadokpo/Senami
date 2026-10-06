// Implicit conversion reads the decorator type metadata: load the polyfill
// here, so a script validating the environment without Nest works too.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

export enum LogLevel {
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  LOG = 'log',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Contract for the environment variables, validated at startup.
 * Consumers inject a namespace (`appConfig`, `databaseConfig`), not this class.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.DEVELOPMENT;

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

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.LOG;

  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a postgres:// connection string',
  })
  DATABASE_URL: string;
}

let cached: EnvironmentVariables | undefined;

export function validateEnvironment(
  raw: Record<string, unknown>,
): EnvironmentVariables {
  const parsed = plainToInstance(EnvironmentVariables, raw, {
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

  cached = parsed;
  return parsed;
}

/** Validated environment, for the `registerAs` factories. */
export function env(): EnvironmentVariables {
  return cached ?? validateEnvironment(process.env);
}
