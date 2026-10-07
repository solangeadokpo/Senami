import { readClientInfo } from './client-info.decorator.js';

describe('readClientInfo', () => {
  it('reads the IP address and the user agent', () => {
    expect(
      readClientInfo({
        ip: '203.0.113.7',
        headers: { 'user-agent': 'Mozilla/5.0' },
      }),
    ).toEqual({ ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0' });
  });

  it('gives null for missing values', () => {
    expect(readClientInfo({ ip: undefined, headers: {} })).toEqual({
      ipAddress: null,
      userAgent: null,
    });
  });

  it('cuts a user agent longer than 512 characters', () => {
    const { userAgent } = readClientInfo({
      ip: '203.0.113.7',
      headers: { 'user-agent': 'x'.repeat(2000) },
    });

    expect(userAgent).toHaveLength(512);
  });
});
