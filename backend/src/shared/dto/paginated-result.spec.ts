import { PaginatedResult } from './paginated-result.js';

describe('PaginatedResult', () => {
  it('computes the meta from total, page and limit', () => {
    expect(PaginatedResult.of(['a', 'b'], 45, 2, 20).meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('has neither next nor previous page for a single page', () => {
    const { meta } = PaginatedResult.of([], 0, 1, 20);

    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });
});
