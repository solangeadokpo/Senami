export enum SeedLevel {
  /** The first super administrator. Every environment. */
  BOOTSTRAP = 'bootstrap',
  /** Demo establishment and its users. Never in production. */
  DEMO = 'demo',
  ALL = 'all',
}
