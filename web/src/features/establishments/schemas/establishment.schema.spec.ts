import { EstablishmentType } from '@shared/enums/establishment-type.enum';
import {
  establishmentSchema,
  responsableSchema,
  toApiFields,
} from './establishment.schema';

const VALID = {
  name: 'École Sainte-Marie',
  type: EstablishmentType.PRIMAIRE,
  addressLine: '3 rue des Écoles',
  postalCode: '59000',
  city: 'Lille',
  phone: '',
  email: '',
};

describe('establishment schemas', () => {
  it('accepts an establishment without phone nor email', () => {
    expect(establishmentSchema.safeParse(VALID).success).toBe(true);
  });

  it('names each wrong field', () => {
    const result = establishmentSchema.safeParse({
      ...VALID,
      postalCode: '5900',
      email: 'contact',
      type: undefined,
    });
    const messages = result.success
      ? []
      : result.error.issues.map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining([
        'Saisissez un code postal à cinq chiffres.',
        'Saisissez une adresse e-mail valide, par exemple contact@ecole.fr.',
        'Choisissez le type d’établissement.',
      ]),
    );
  });

  it('requires the responsable email', () => {
    const result = responsableSchema.safeParse({
      firstName: 'Léa',
      lastName: 'Martin',
      email: '',
    });

    expect(
      result.success ? [] : result.error.issues.map((issue) => issue.message),
    ).toEqual(['Saisissez l’e-mail du responsable.']);
  });

  it('sends empty optional fields as null', () => {
    expect(toApiFields(VALID)).toMatchObject({ phone: null, email: null });
  });
});
