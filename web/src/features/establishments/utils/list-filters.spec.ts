import { EstablishmentStatus } from '@shared/enums/establishment-status.enum';
import { filtersFromSearchParams, filtersToQuery } from './list-filters';

describe('list filters', () => {
  it('reads the URL, ignoring an unknown status and a wrong page', () => {
    expect(
      filtersFromSearchParams({
        q: ' sainte ',
        ville: 'Lille',
        statut: 'inconnu',
        page: '-3',
      }),
    ).toEqual({ search: 'sainte', city: 'Lille', status: undefined, page: 1 });
  });

  it('writes back only what differs from the defaults', () => {
    expect(
      filtersToQuery({
        search: 'école',
        city: '',
        status: EstablishmentStatus.SUSPENDED,
        page: 2,
      }),
    ).toBe('?q=%C3%A9cole&statut=suspended&page=2');
    expect(
      filtersToQuery({ search: '', city: '', status: undefined, page: 1 }),
    ).toBe('');
  });
});
