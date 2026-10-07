import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import type { INestApplication } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE,
  type Database,
  asSuperAdmin,
  withTenant,
} from '@core/database/index.js';
import { PostgresErrorMapper } from '@core/database/postgres-error.mapper.js';
import { establishments, students } from '@database/schema/index.js';
import { createTestApp } from './app.js';

describe('tenant isolation (row level security)', () => {
  let app: INestApplication;
  let db: Database;
  let schoolA: string;
  let schoolB: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DRIZZLE);

    const created = await db
      .insert(establishments)
      .values([
        {
          name: 'School A',
          type: EstablishmentType.PRIMAIRE,
          addressLine: '1 rue A',
          postalCode: '59000',
          city: 'Lille',
        },
        {
          name: 'School B',
          type: EstablishmentType.COLLEGE,
          addressLine: '2 rue B',
          postalCode: '75001',
          city: 'Paris',
        },
      ])
      .returning({ id: establishments.id });
    const [a, b] = created;
    if (a === undefined || b === undefined) {
      throw new Error('fixtures not created');
    }
    schoolA = a.id;
    schoolB = b.id;

    await withTenant(db, schoolA, (tx) =>
      tx.insert(students).values({
        establishmentId: schoolA,
        lastName: 'Martin',
        firstName: 'Sacha',
        classGroup: 'CE2',
      }),
    );
  });

  afterAll(async () => {
    await asSuperAdmin(db, (tx) =>
      tx
        .delete(students)
        .where(inArray(students.establishmentId, [schoolA, schoolB])),
    );
    await db
      .delete(establishments)
      .where(inArray(establishments.id, [schoolA, schoolB]));
    await app.close();
  });

  it('shows an establishment its own students', async () => {
    const rows = await withTenant(db, schoolA, (tx) =>
      tx.select().from(students).where(eq(students.establishmentId, schoolA)),
    );

    expect(rows.map((s) => s.lastName)).toEqual(['Martin']);
  });

  it("hides another establishment's students", async () => {
    const rows = await withTenant(db, schoolB, (tx) =>
      tx.select().from(students).where(eq(students.establishmentId, schoolA)),
    );

    expect(rows).toEqual([]);
  });

  it('reads nothing outside a tenant transaction', async () => {
    const rows = await db
      .select()
      .from(students)
      .where(eq(students.establishmentId, schoolA));

    expect(rows).toEqual([]);
  });

  it('reports a write refused by row level security as FORBIDDEN', async () => {
    const refusal: unknown = await withTenant(db, schoolB, (tx) =>
      tx.insert(students).values({
        establishmentId: schoolA,
        lastName: 'Intrus',
        firstName: 'X',
        classGroup: 'CM1',
      }),
    ).catch((error: unknown) => error);

    expect(new PostgresErrorMapper().map(refusal)).toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      securityAlert: true,
    });
  });

  it("rejects a write into another establishment's data", async () => {
    await expect(
      withTenant(db, schoolB, (tx) =>
        tx.insert(students).values({
          establishmentId: schoolA,
          lastName: 'Intrus',
          firstName: 'X',
          classGroup: 'CM1',
        }),
      ),
    ).rejects.toThrow();
  });
});
