import {
  Building2,
  CreditCard,
  FileText,
  LayoutGrid,
  type LucideIcon,
  Settings2,
  Users,
} from 'lucide-react';
import { UserRole } from '@shared/enums/user-role.enum';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** False until the page exists: shown, but not a link. */
  isAvailable: boolean;
}

const RESPONSABLE: NavItem[] = [
  { label: 'Tableau de bord', href: '/', icon: LayoutGrid, isAvailable: true },
  {
    label: 'Utilisateurs et droits',
    href: '/utilisateurs',
    icon: Users,
    isAvailable: false,
  },
  {
    label: 'Fiche et destinataires',
    href: '/fiche',
    icon: FileText,
    isAvailable: false,
  },
  {
    label: 'Abonnement',
    href: '/abonnement',
    icon: CreditCard,
    isAvailable: false,
  },
];

const SUPER_ADMIN: NavItem[] = [
  { label: 'Tableau de bord', href: '/', icon: LayoutGrid, isAvailable: true },
  {
    label: 'Établissements',
    href: '/etablissements',
    icon: Building2,
    isAvailable: false,
  },
  {
    label: 'Abonnements',
    href: '/abonnements',
    icon: CreditCard,
    isAvailable: false,
  },
  {
    label: 'Paramètres',
    href: '/parametres',
    icon: Settings2,
    isAvailable: false,
  },
];

export function navItemsFor(role: UserRole): NavItem[] {
  return role === UserRole.SUPER_ADMIN ? SUPER_ADMIN : RESPONSABLE;
}
