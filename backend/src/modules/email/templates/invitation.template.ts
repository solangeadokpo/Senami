import {
  frenchDate,
  frenchTime,
} from '@modules/email/templates/french-dates.js';
import { textEmail } from '@modules/email/templates/text-email.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { OutgoingEmail } from '@shared/interfaces/email-sender.interface.js';

export interface InvitationEmailInput {
  to: string;
  firstName: string;
  role: UserRole;
  establishmentName: string;
  establishmentCity: string;
  link: string;
  expiresAt: Date;
}

/** The value of a role is its French noun, but for the super admin. */
function roleNoun(role: UserRole): string {
  return role === UserRole.SUPER_ADMIN ? 'administrateur' : role;
}

/** Version A, validated with the mockup. The subject never names a pupil. */
export function invitationEmail(input: InvitationEmailInput): OutgoingEmail {
  const { text, html } = textEmail([
    `Bonjour ${input.firstName},`,
    `Vous êtes désormais ${roleNoun(input.role)} de l’établissement ${input.establishmentName} (${input.establishmentCity}) sur Sènami, l’outil de déclaration des accidents bénins.`,
    `Pour activer votre compte, créez votre mot de passe :\n${input.link}`,
    `Ce lien est valable 72 heures, jusqu’au ${frenchDate(input.expiresAt)} à ${frenchTime(input.expiresAt)}.`,
    'Vous n’attendiez pas ce message ? Ignorez-le : votre compte ne sera pas activé.',
    'L’équipe Sènami\nsenami.app',
  ]);
  return {
    to: input.to,
    subject: `Activez votre compte Sènami · ${input.establishmentName}`,
    text,
    html,
    template: 'invitation',
  };
}
