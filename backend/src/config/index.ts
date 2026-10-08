import { appConfig } from './app.config.js';
import { authConfig } from './auth.config.js';
import { databaseConfig } from './database.config.js';
import { mailConfig } from './mail.config.js';

export { appConfig, type AppConfig } from './app.config.js';
export { authConfig, type AuthConfig } from './auth.config.js';
export { databaseConfig, type DatabaseConfig } from './database.config.js';
export { mailConfig, type MailConfig } from './mail.config.js';
export {
  EnvironmentVariables,
  LogFormat,
  LogLevel,
  NodeEnv,
  BootstrapSeedEnvironment,
  DemoSeedEnvironment,
  ScriptEnvironment,
  env,
  logSettings,
  validateEnvironment,
  validateBootstrapSeedEnvironment,
  validateDemoSeedEnvironment,
  validateScriptEnvironment,
} from './env.validation.js';
export { SWAGGER_PATH, setupSwagger } from './swagger.js';

/** Namespaces loaded by `ConfigModule.forRoot({ load: configurations })`. */
export const configurations = [
  appConfig,
  authConfig,
  databaseConfig,
  mailConfig,
];
