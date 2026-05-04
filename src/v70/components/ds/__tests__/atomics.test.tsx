// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  PageHeader,
  Section,
  Card,
  Button,
  Pill,
  StatsGrid,
  Stat,
  ListItem,
  TabsMini,
} from '../../../index';

afterEach(() => cleanup());

describe('V70 atomics — smoke tests', () => {
  it('PageHeader rend eyebrow + title + subtitle', () => {
    render(<PageHeader eyebrow="TEST" title="Mon titre" subtitle="sous-titre" />);
    expect(screen.getByText('TEST')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: /mon titre/i })).toBeTruthy();
    expect(screen.getByText('sous-titre')).toBeTruthy();
  });

  it('PageHeader rend les breadcrumbs si fournis', () => {
    render(
      <PageHeader
        eyebrow="EB"
        title="Titre"
        breadcrumbs={[
          { label: 'Élevage', href: '/elevage' },
          { label: 'Truies', href: '/elevage/truies' },
        ]}
      />,
    );
    expect(screen.getByText('Élevage')).toBeTruthy();
    expect(screen.getByText('Truies')).toBeTruthy();
  });

  it('Section rend label + children', () => {
    render(
      <Section label="MON ÉLEVAGE">
        <div>contenu</div>
      </Section>,
    );
    expect(screen.getByText('MON ÉLEVAGE')).toBeTruthy();
    expect(screen.getByText('contenu')).toBeTruthy();
  });

  it('Card variant default applique classe card', () => {
    const { container } = render(<Card>contenu</Card>);
    expect(container.querySelector('.card')).toBeTruthy();
  });

  it('Card variant hero applique classe card-hero', () => {
    const { container } = render(<Card variant="hero">hero</Card>);
    expect(container.querySelector('.card-hero')).toBeTruthy();
  });

  it('Button rend avec variant primary', () => {
    render(<Button variant="primary">Cliquer</Button>);
    const btn = screen.getByRole('button', { name: /cliquer/i });
    expect(btn).toBeTruthy();
    expect(btn.className).toContain('btn-primary');
  });

  it('Button size full applique btn-full', () => {
    render(
      <Button variant="primary" size="full">
        Plein
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /plein/i });
    expect(btn.className).toContain('btn-full');
  });

  it('Pill rend avec variant warning', () => {
    render(<Pill variant="warning">Action</Pill>);
    expect(screen.getByText('Action').className).toContain('pill-warning');
  });

  it('StatsGrid + Stat rend value + label', () => {
    render(
      <StatsGrid>
        <Stat value={50} label="Truies" />
        <Stat value={3} label="Verrats" />
      </StatsGrid>,
    );
    expect(screen.getByText('50')).toBeTruthy();
    expect(screen.getByText('Truies')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('ListItem rend title + subtitle + déclenche onClick', () => {
    const onClick = vi.fn();
    render(
      <ListItem
        title="T-001"
        subtitle="En attente saillie"
        onClick={onClick}
      />,
    );
    const item = screen.getByRole('button', { name: /t-001/i });
    expect(screen.getByText('T-001')).toBeTruthy();
    expect(screen.getByText('En attente saillie')).toBeTruthy();
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('TabsMini rend les options et déclenche onChange', () => {
    const onChange = vi.fn();
    render(
      <TabsMini
        value="truies"
        onChange={onChange}
        options={[
          { value: 'truies', label: 'Truies' },
          { value: 'verrats', label: 'Verrats' },
        ]}
      />,
    );
    const verrats = screen.getByRole('tab', { name: /verrats/i });
    fireEvent.click(verrats);
    expect(onChange).toHaveBeenCalledWith('verrats');

    const truies = screen.getByRole('tab', { name: /truies/i });
    expect(truies.className).toContain('active');
  });
});
