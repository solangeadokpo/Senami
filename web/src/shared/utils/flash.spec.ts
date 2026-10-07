import { FLASH_COOKIE, readFlash } from './flash';

describe('flash', () => {
  it('reads back what was encoded, among other cookies', () => {
    const cookie = `theme=light; ${FLASH_COOKIE}=${encodeURIComponent(JSON.stringify({ kind: 'signed-out' }))}; other=1`;

    expect(readFlash(cookie)).toEqual({ kind: 'signed-out' });
  });

  it('gives null without flash or with a damaged one', () => {
    expect(readFlash('theme=light')).toBeNull();
    expect(readFlash(`${FLASH_COOKIE}=%7Bnot-json`)).toBeNull();
  });
});
