import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './password-input';

describe('PasswordInput', () => {
  it('shows and hides the password', async () => {
    render(<PasswordInput aria-label="Mot de passe" defaultValue="secret" />);
    const input = screen.getByLabelText('Mot de passe');

    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(
      screen.getByRole('button', { name: 'Afficher le mot de passe' }),
    );
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(
      screen.getByRole('button', { name: 'Masquer le mot de passe' }),
    );
    expect(input).toHaveAttribute('type', 'password');
  });

  it('reports caps lock', async () => {
    const onCapsLockChange = vi.fn();
    render(
      <PasswordInput
        aria-label="Mot de passe"
        onCapsLockChange={onCapsLockChange}
      />,
    );

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'a');

    expect(onCapsLockChange).toHaveBeenCalledWith(false);
  });
});
