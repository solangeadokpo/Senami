import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { OtpInput } from './otp-input';

function Harness({ onValue }: { onValue?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <p id="label">Code à six chiffres</p>
      <OtpInput
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue?.(next);
        }}
        labelledBy="label"
      />
    </>
  );
}

const boxes = () => screen.getAllByRole('textbox');

describe('OtpInput', () => {
  it('moves to the next box while typing, digits only', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('12a3');

    expect(onValue).toHaveBeenLastCalledWith('123');
    expect(boxes()[3]).toHaveFocus();
  });

  it('fills every box from a pasted code', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await userEvent.click(boxes()[0]!);
    await userEvent.paste('123 456');

    expect(onValue).toHaveBeenLastCalledWith('123456');
    expect(boxes().map((box) => (box as HTMLInputElement).value)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('goes back and clears with Backspace on an empty box', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    await userEvent.click(boxes()[0]!);
    await userEvent.keyboard('12{Backspace}');

    expect(onValue).toHaveBeenLastCalledWith('1');
    expect(boxes()[1]).toHaveFocus();
  });

  it('names each box for screen readers', () => {
    render(<Harness />);

    expect(
      screen.getByRole('group', { name: 'Code à six chiffres' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Chiffre 1 sur 6')).toBeInTheDocument();
  });
});
