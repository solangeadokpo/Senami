import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('is a button that reacts to a click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enregistrer</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders its child instead with asChild', () => {
    render(
      <Button asChild>
        <a href="/connexion">Se connecter</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
      'data-slot',
      'button',
    );
  });
});
