// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PageHeader } from './index';

describe('PageHeader (V41)', () => {
  afterEach(() => cleanup());

  it('rend eyebrow uppercase + h1 + subtitle', () => {
    render(<PageHeader eyebrow="Reproduction" title="Reproduction" subtitle="Le cycle truie de ta ferme" />);
    expect(screen.getByText('REPRODUCTION')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Reproduction');
    expect(screen.getByText('Le cycle truie de ta ferme')).toBeDefined();
  });

  it('rend sans subtitle (optionnel)', () => {
    const { container } = render(<PageHeader eyebrow="OUTILS" title="Outils" />);
    expect(container.querySelector('.pt-page-header__subtitle')).toBeNull();
  });

  it('uppercase auto sur eyebrow lowercase', () => {
    render(<PageHeader eyebrow="audit" title="Alertes" />);
    expect(screen.getByText('AUDIT')).toBeDefined();
  });

  it('utilise les classes pt-page-header__*', () => {
    const { container } = render(<PageHeader eyebrow="X" title="Y" subtitle="Z" />);
    expect(container.querySelector('.pt-page-header')).not.toBeNull();
    expect(container.querySelector('.pt-page-header__eyebrow')).not.toBeNull();
    expect(container.querySelector('.pt-page-header__title')).not.toBeNull();
    expect(container.querySelector('.pt-page-header__subtitle')).not.toBeNull();
    expect(container.querySelector('.pt-page-header__dot')).not.toBeNull();
  });
});
