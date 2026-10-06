import { pathWithoutQuery } from './path-without-query.js';

describe('pathWithoutQuery', () => {
  it('drops the query string', () => {
    expect(pathWithoutQuery('/api/v1/students?q=Martin&page=2')).toBe(
      '/api/v1/students',
    );
  });

  it('leaves a path without query string untouched', () => {
    expect(pathWithoutQuery('/api/v1/students')).toBe('/api/v1/students');
  });

  it.each(['//evil.example/api/v1/x', '/api/v1/../../admin', '/api/%2e%2e/x'])(
    'keeps the suspicious path %s as received',
    (path) => {
      expect(pathWithoutQuery(`${path}?q=1`)).toBe(path);
    },
  );
});
