// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import FormField from './FormField';
import Input from './Input';

afterEach(() => cleanup());

describe('FormField V30', () => {
  it('renders label and child input', () => {
    render(
      <FormField label="Nom de la truie">
        <Input data-testid="inp" />
      </FormField>,
    );
    expect(screen.getByText('Nom de la truie')).toBeDefined();
    expect(screen.getByTestId('inp')).toBeDefined();
  });

  it('label is uppercase tracked', () => {
    render(
      <FormField label="boucle">
        <Input />
      </FormField>,
    );
    const label = screen.getByText('boucle');
    expect(label.style.textTransform).toBe('uppercase');
    expect(label.style.letterSpacing).toBe('var(--pt-tracking-label)');
  });

  it('shows required asterisk when required=true', () => {
    render(
      <FormField label="Code" required>
        <Input />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeDefined();
  });

  it('renders hint in non-mono font', () => {
    render(
      <FormField label="x" hint="Format : T01, T02…">
        <Input />
      </FormField>,
    );
    const hint = screen.getByText(/Format : T01/);
    expect(hint.style.fontFamily).toContain('var(--pt-font-body)');
    expect(hint.style.fontFamily).not.toContain('mono');
    expect(hint.style.color).toBe('var(--pt-text-muted)');
  });

  it('error replaces hint with role="alert"', () => {
    render(
      <FormField label="x" hint="ignored hint" error="Champ obligatoire">
        <Input />
      </FormField>,
    );
    const err = screen.getByRole('alert');
    expect(err.textContent).toBe('Champ obligatoire');
    expect(err.style.color).toBe('var(--pt-danger)');
    expect(screen.queryByText('ignored hint')).toBeNull();
  });

  it('renders neither hint nor error when both absent', () => {
    render(
      <FormField label="x">
        <Input />
      </FormField>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
