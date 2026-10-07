import { resolveZone } from './zones';

const APP_HOST = 'app.senami.fr';

describe('resolveZone', () => {
  it('serves the site on its own host', () => {
    expect(resolveZone('www.senami.fr', '/tarifs', APP_HOST)).toEqual({
      kind: 'site',
    });
  });

  it('rewrites the back office host under /admin', () => {
    expect(resolveZone(APP_HOST, '/', APP_HOST)).toEqual({
      kind: 'admin',
      rewriteTo: '/admin/',
    });
    expect(resolveZone(APP_HOST, '/etablissements', APP_HOST)).toEqual({
      kind: 'admin',
      rewriteTo: '/admin/etablissements',
    });
  });

  it('hides the back office from the site host', () => {
    expect(resolveZone('www.senami.fr', '/admin', APP_HOST)).toEqual({
      kind: 'not-found',
    });
    expect(resolveZone('www.senami.fr', '/admin/users', APP_HOST)).toEqual({
      kind: 'not-found',
    });
  });

  it('keeps a site page whose name starts like admin', () => {
    expect(resolveZone('www.senami.fr', '/administration', APP_HOST)).toEqual({
      kind: 'site',
    });
  });

  it('treats a missing host as the site', () => {
    expect(resolveZone(null, '/', APP_HOST)).toEqual({ kind: 'site' });
  });
});
