import { render, screen } from '@testing-library/react';
import { Logo } from './logo';

describe('Logo', () => {
  it('shows the kit file under the brand name, keeping its proportions', () => {
    render(<Logo width={160} />);

    const logo = screen.getByRole('img', { name: 'Sènami' });
    expect(logo).toHaveAttribute('src', '/brand/senami-principal.svg');
    expect(logo).toHaveAttribute('width', '160');
    expect(logo).toHaveAttribute('height', '32');
  });

  it('uses the badge alone for small sizes', () => {
    render(<Logo variant="badge" width={32} />);

    const logo = screen.getByRole('img', { name: 'Sènami' });
    expect(logo).toHaveAttribute('src', '/brand/senami-pastille.svg');
    expect(logo).toHaveAttribute('height', '32');
  });
});
