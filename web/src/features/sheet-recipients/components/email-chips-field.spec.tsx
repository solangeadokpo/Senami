import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { hasEmail, isEmail } from '@features/sheet-recipients/utils/email-list';
import { EmailChipsField } from './email-chips-field';

const validate = (email: string, accepted: string[]) => {
  if (!isEmail(email)) return 'Adresse e-mail invalide.';
  return hasEmail(accepted, email)
    ? 'Cette adresse figure déjà parmi les destinataires.'
    : null;
};

function Harness({
  initial = [],
  isLastRequired = false,
}: {
  initial?: string[];
  isLastRequired?: boolean;
}) {
  const [emails, setEmails] = useState(initial);
  return (
    <EmailChipsField
      id="to"
      label="Destinataires principaux"
      emails={emails}
      onChange={setEmails}
      validate={validate}
      isLastRequired={isLastRequired}
    />
  );
}

const input = () => screen.getByLabelText('Destinataires principaux');
const chips = () =>
  screen.queryAllByRole('listitem').map((item) => item.textContent);

describe('EmailChipsField', () => {
  it('adds an address on Enter, comma and leaving the field', async () => {
    render(<Harness />);

    await userEvent.type(input(), 'a@ecole.fr{Enter}b@ecole.fr,c@ecole.fr');
    await userEvent.tab();

    expect(chips()).toEqual(['a@ecole.fr', 'b@ecole.fr', 'c@ecole.fr']);
    expect(input()).toHaveValue('');
  });

  it('adds every address of a pasted list', async () => {
    render(<Harness />);

    await userEvent.click(input());
    await userEvent.paste('a@ecole.fr; b@ecole.fr\nc@ecole.fr');

    expect(chips()).toEqual(['a@ecole.fr', 'b@ecole.fr', 'c@ecole.fr']);
  });

  it('keeps an invalid address in the input with its message', async () => {
    render(<Harness />);

    await userEvent.type(input(), 'direction{Enter}');

    expect(chips()).toEqual([]);
    expect(input()).toHaveValue('direction');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Adresse e-mail invalide.')).toBeInTheDocument();
  });

  it('refuses an address already present, case ignored', async () => {
    render(<Harness initial={['direction@ecole.fr']} />);

    await userEvent.type(input(), 'Direction@ecole.fr{Enter}');

    expect(chips()).toEqual(['direction@ecole.fr']);
    expect(
      screen.getByText('Cette adresse figure déjà parmi les destinataires.'),
    ).toBeInTheDocument();
  });

  it('removes a chip with its cross', async () => {
    render(<Harness initial={['a@ecole.fr', 'b@ecole.fr']} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Retirer a@ecole.fr' }),
    );

    expect(chips()).toEqual(['b@ecole.fr']);
  });

  it('selects then removes the last chip with Backspace', async () => {
    render(<Harness initial={['a@ecole.fr', 'b@ecole.fr']} />);

    await userEvent.type(input(), '{Backspace}');
    expect(chips()).toEqual(['a@ecole.fr', 'b@ecole.fr']);
    await userEvent.type(input(), '{Backspace}');

    expect(chips()).toEqual(['a@ecole.fr']);
  });

  it('keeps the last main recipient', async () => {
    render(<Harness initial={['direction@ecole.fr']} isLastRequired />);

    expect(
      screen.getByRole('button', { name: 'Retirer direction@ecole.fr' }),
    ).toBeDisabled();
    await userEvent.type(input(), '{Backspace}{Backspace}');

    expect(chips()).toEqual(['direction@ecole.fr']);
    expect(
      screen.getByText('Au moins un destinataire principal est requis.'),
    ).toBeInTheDocument();
  });
});
