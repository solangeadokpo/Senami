/** Single source of the roles: the PostgreSQL enum is built from it. */
export enum UserRole {
  INTERVENANT = 'intervenant',
  RESPONSABLE = 'responsable',
  SUPER_ADMIN = 'super_admin',
}
