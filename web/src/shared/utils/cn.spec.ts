import { cn } from './cn';

describe('cn', () => {
  it('keeps a charter text size next to a colour', () => {
    expect(cn('text-label text-slate-700')).toBe('text-label text-slate-700');
  });

  it('lets a later size win over an earlier one', () => {
    expect(cn('text-label', 'text-title')).toBe('text-title');
  });
});
