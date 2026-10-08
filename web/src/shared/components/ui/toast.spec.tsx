import { act, render, screen } from '@testing-library/react';
import { Toast } from './toast';

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const isShown = (text: string) =>
    screen
      .getByText(text)
      .closest('[role="status"]')
      ?.className.includes('opacity-100');

  it('shows the message, then hides it after four seconds', () => {
    render(<Toast message="Établissement mis à jour." />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(isShown('Établissement mis à jour.')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(isShown('Établissement mis à jour.')).toBe(false);
  });

  it('hides the toast already showing when another one appears', () => {
    const { rerender } = render(
      <>
        <Toast message="Établissement mis à jour." />
        <Toast message={null} />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender(
      <>
        <Toast message="Établissement mis à jour." />
        <Toast message="Collège Pasteur est suspendu." />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(isShown('Établissement mis à jour.')).toBe(false);
    expect(isShown('Collège Pasteur est suspendu.')).toBe(true);
  });
});
