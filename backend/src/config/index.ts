import { appConfig } from './app.config.js';
import { databaseConfig } from './database.config.js';

export { appConfig, type AppConfig } from './app.config.js';
export { databaseConfig, type DatabaseConfig } from './database.config.js';
export {
  EnvironmentVariables,
  LogFormat,
  LogLevel,
  NodeEnv,
  env,
  validateEnvironment,
} from './env.validation.js';
export { SWAGGER_PATH, setupSwagger } from './swagger.js';

/** Namespaces loaded by `ConfigModule.forRoot({ load: configurations })`. */
export const configurations = [appConfig, databaseConfig];
