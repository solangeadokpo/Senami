import { findSetCookie } from './set-cookie';

describe('findSetCookie', () => {
  it('reads the value and the expiry of the named cookie', () => {
    expect(
      findSetCookie(
        [
          'other=1; Path=/',
          'senami_session=abc123; Path=/; Expires=Wed, 07 Oct 2026 22:00:00 GMT; HttpOnly; SameSite=Lax',
        ],
        'senami_session',
      ),
    ).toEqual({
      value: 'abc123',
      expires: new Date('2026-10-07T22:00:00.000Z'),
    });
  });

  it('gives undefined when the cookie is absent or empty', () => {
    expect(findSetCookie(['other=1'], 'senami_session')).toBeUndefined();
    expect(
      findSetCookie(['senami_session=; Path=/'], 'senami_session'),
    ).toBeUndefined();
  });

  it('keeps a session cookie without a valid expiry', () => {
    expect(
      findSetCookie(['senami_session=abc; Expires=never'], 'senami_session'),
    ).toEqual({ value: 'abc', expires: undefined });
  });
});
