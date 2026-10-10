import { RecipientList } from '@shared/enums/recipient-list.enum';
import {
  DUPLICATE_EMAIL,
  INVALID_EMAIL,
  NO_PRIMARY_RECIPIENT,
  recipientsSchema,
} from './sheet-recipients.schema';

describe('recipientsSchema', () => {
  it('accepts a main recipient with copies', () => {
    expect(
      recipientsSchema.safeParse({
        to: ['direction@ecole.fr'],
        cc: ['infirmerie@ecole.fr'],
        bcc: [],
      }).success,
    ).toBe(true);
  });

  it('refuses an empty main list', () => {
    const parsed = recipientsSchema.safeParse({ to: [], cc: [], bcc: [] });

    expect(parsed.error?.issues).toEqual([
      expect.objectContaining({
        path: [RecipientList.TO],
        message: NO_PRIMARY_RECIPIENT,
      }),
    ]);
  });

  it('refuses an invalid email', () => {
    const parsed = recipientsSchema.safeParse({
      to: ['direction@ecole.fr'],
      cc: ['infirmerie'],
      bcc: [],
    });

    expect(parsed.error?.issues).toEqual([
      expect.objectContaining({
        path: [RecipientList.CC, 0],
        message: INVALID_EMAIL,
      }),
    ]);
  });

  it('refuses a duplicate across the lists, case ignored', () => {
    const parsed = recipientsSchema.safeParse({
      to: ['direction@ecole.fr'],
      cc: [],
      bcc: ['Direction@Ecole.fr'],
    });

    expect(parsed.error?.issues).toEqual([
      expect.objectContaining({
        path: [RecipientList.BCC, 0],
        message: DUPLICATE_EMAIL,
      }),
    ]);
  });
});
