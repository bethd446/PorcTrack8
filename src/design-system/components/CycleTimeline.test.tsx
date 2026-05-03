// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CycleTimeline } from './index';

afterEach(() => cleanup());

const baseSteps = [
  { label: 'Saillie', day: 0, done: true },
  { label: 'Surveillance', day: 7, done: true },
  { label: 'Échographie', day: 28, done: true },
  { label: 'Mise-bas', day: 115, done: false, target: true },
];

describe('CycleTimeline', () => {
  it('rend tous les labels des steps', () => {
    render(<CycleTimeline currentDay={113} totalDays={115} steps={baseSteps} />);
    expect(screen.getByText('Saillie')).toBeTruthy();
    expect(screen.getByText('Surveillance')).toBeTruthy();
    expect(screen.getByText('Échographie')).toBeTruthy();
    expect(screen.getByText('Mise-bas')).toBeTruthy();
  });

  it('rend l’eyebrow "Saillie · jour 113/115" si fourni', () => {
    render(
      <CycleTimeline currentDay={113} totalDays={115} steps={baseSteps} eyebrow="Saillie" />,
    );
    expect(screen.getByText(/Saillie · jour 113\/115/)).toBeTruthy();
  });

  it('applique une largeur de progression cohérente avec currentDay/totalDays', () => {
    const { container } = render(
      <CycleTimeline currentDay={50} totalDays={100} steps={baseSteps} />,
    );
    const progress = container.querySelector('.pt-cycle__progress') as HTMLElement;
    expect(progress).toBeTruthy();
    expect(progress.style.width).toBe('50%');
  });

  it('marque l’étape done avec un node done et target avec un node target', () => {
    const { container } = render(
      <CycleTimeline currentDay={113} totalDays={115} steps={baseSteps} />,
    );
    expect(container.querySelectorAll('.pt-cycle__node--done').length).toBe(3);
    expect(container.querySelectorAll('.pt-cycle__node--target').length).toBe(1);
  });

  it('alterne le placement des labels rapprochés (anti-collision)', () => {
    const tight = [
      { label: 'A', day: 0, done: true },
      { label: 'B', day: 5, done: true },
      { label: 'C', day: 100, done: false },
    ];
    const { container } = render(<CycleTimeline currentDay={50} totalDays={100} steps={tight} />);
    expect(container.querySelectorAll('.pt-cycle__step--above').length).toBeGreaterThan(0);
  });
});
