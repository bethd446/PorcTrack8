// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Tooltip } from '../Tooltip';
import { EduCard } from '../EduCard';
import { EmptyEdu } from '../EmptyEdu';
import { ExportButton } from '../ExportButton';

afterEach(() => cleanup());

describe('V70 specifics — smoke tests', () => {
  it('Tooltip charge depuis tooltips.json', () => {
    render(<Tooltip term="saillie" />);
    expect(screen.getByText(/saillie/i)).toBeTruthy();
    expect(screen.getByLabelText(/définition saillie/i)).toBeTruthy();
  });

  it('EduCard rend label + content', () => {
    render(<EduCard>Test content</EduCard>);
    // V71.4 — label par défaut sans emoji (Lucide Lightbulb à la place de 💡)
    expect(screen.getByText('Le saviez-vous ?')).toBeTruthy();
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('EmptyEdu rend icon + title + description', () => {
    render(<EmptyEdu title="Vide" description="Plus rien" />);
    expect(screen.getByText('📚')).toBeTruthy();
    expect(screen.getByText('Vide')).toBeTruthy();
    expect(screen.getByText('Plus rien')).toBeTruthy();
  });

  it('ExportButton disabled si data vide', () => {
    render(<ExportButton data={[]} />);
    const btn = screen.getByRole('button', { name: /export csv/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
