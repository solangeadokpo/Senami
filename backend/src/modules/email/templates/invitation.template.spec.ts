import { UserRole } from '@shared/enums/user-role.enum.js';
import { invitationEmail } from './invitation.template.js';

const INPUT = {
  to: 'direction@saint-denis.fr',
  firstName: 'Claire',
  role: UserRole.RESPONSABLE,
  establishmentName: 'École Saint-Denis',
  establishmentCity: 'Lille',
  link: 'https://app.senami.fr/invitation#abc123',
  expiresAt: new Date('2026-10-10T12:32:00.000Z'),
};

describe('invitationEmail', () => {
  it('names the establishment in the subject, never anything else', () => {
    expect(invitationEmail(INPUT).subject).toBe(
      'Activez votre compte Sènami · École Saint-Denis',
    );
  });

  it('gives the role, the link and the expiry in France time', () => {
    const { text } = invitationEmail(INPUT);

    expect(text).toContain(
      'Vous êtes désormais responsable de l’établissement École Saint-Denis (Lille)',
    );
    expect(text).toContain('https://app.senami.fr/invitation#abc123');
    expect(text).toContain('jusqu’au 10 octobre 2026 à 14 h 32');
  });

  it('follows the role of the invited user', () => {
    expect(
      invitationEmail({ ...INPUT, role: UserRole.INTERVENANT }).text,
    ).toContain('Vous êtes désormais intervenant');
  });

  it('keeps the HTML to text: no image, no button, the link in full', () => {
    const { html } = invitationEmail(INPUT);

    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<button/i);
    expect(html).toContain(
      '<a href="https://app.senami.fr/invitation#abc123">https://app.senami.fr/invitation#abc123</a>',
    );
    expect(html).toContain('font-family:Arial');
  });

  it('escapes what comes from the database', () => {
    const { html } = invitationEmail({
      ...INPUT,
      establishmentName: 'École <b>A&B</b>',
    });

    expect(html).toContain('École &lt;b&gt;A&amp;B&lt;/b&gt;');
  });
});
