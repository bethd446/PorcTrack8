// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EntityAvatar } from './EntityAvatar';

afterEach(() => cleanup());

describe('EntityAvatar', () => {
  it('rend une silhouette truie sans photo', () => {
    render(<EntityAvatar species="truie" />);
    expect(screen.getByRole('img', { name: /avatar truie/i })).toBeTruthy();
  });

  it('rend une silhouette verrat sans photo', () => {
    render(<EntityAvatar species="verrat" />);
    expect(screen.getByRole('img', { name: /avatar verrat/i })).toBeTruthy();
  });

  it('rend une silhouette porcelet sans photo', () => {
    render(<EntityAvatar species="porcelet" />);
    expect(screen.getByRole('img', { name: /avatar porcelet/i })).toBeTruthy();
  });

  it('rend une silhouette bande sans photo', () => {
    render(<EntityAvatar species="bande" />);
    expect(screen.getByRole('img', { name: /avatar bande/i })).toBeTruthy();
  });

  it('rend un SVG (et pas un IMG) en fallback', () => {
    const { container } = render(<EntityAvatar species="truie" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('rend une photo si photoUrl fourni', () => {
    render(
      <EntityAvatar species="truie" photoUrl="https://example.com/truie.jpg" shortCode="T-001" />,
    );
    const img = screen.getByAltText('T-001');
    expect(img).toBeTruthy();
    expect(img.tagName).toBe('IMG');
  });

  it('fallback SVG si img.onError déclenché', () => {
    const { container } = render(
      <EntityAvatar species="truie" photoUrl="invalid" shortCode="T-002" />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    // Après error : plus d'img, SVG affiché
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('respecte la size sm (32px)', () => {
    const { container } = render(<EntityAvatar species="truie" size="sm" />);
    const wrapper = container.querySelector('div[role="img"]') as HTMLElement;
    expect(wrapper.style.width).toBe('32px');
    expect(wrapper.style.height).toBe('32px');
  });

  it('respecte la size md par défaut (48px)', () => {
    const { container } = render(<EntityAvatar species="truie" />);
    const wrapper = container.querySelector('div[role="img"]') as HTMLElement;
    expect(wrapper.style.width).toBe('48px');
    expect(wrapper.style.height).toBe('48px');
  });

  it('respecte la size lg (64px)', () => {
    const { container } = render(<EntityAvatar species="truie" size="lg" />);
    const wrapper = container.querySelector('div[role="img"]') as HTMLElement;
    expect(wrapper.style.width).toBe('64px');
    expect(wrapper.style.height).toBe('64px');
  });

  it('respecte la size xl (96px)', () => {
    const { container } = render(<EntityAvatar species="truie" size="xl" />);
    const wrapper = container.querySelector('div[role="img"]') as HTMLElement;
    expect(wrapper.style.width).toBe('96px');
    expect(wrapper.style.height).toBe('96px');
  });

  it('applique le border-radius selon la taille (sm=12, xl=20)', () => {
    const { container: cSm } = render(<EntityAvatar species="truie" size="sm" />);
    const wrapperSm = cSm.querySelector('div[role="img"]') as HTMLElement;
    expect(wrapperSm.style.borderRadius).toBe('12px');

    const { container: cXl } = render(<EntityAvatar species="truie" size="xl" />);
    const wrapperXl = cXl.querySelector('div[role="img"]') as HTMLElement;
    expect(wrapperXl.style.borderRadius).toBe('20px');
  });

  it('applique la couleur de fond correspondant à l’espèce', () => {
    const { container } = render(<EntityAvatar species="verrat" />);
    const wrapper = container.querySelector('div[role="img"]') as HTMLElement;
    // background-color RGB equivalent of #C8D6E5
    expect(wrapper.style.background.toLowerCase()).toContain('rgb(200, 214, 229)');
  });

  it('expose role="img" + aria-label avec shortCode', () => {
    render(<EntityAvatar species="bande" shortCode="B-001" />);
    expect(screen.getByLabelText('Avatar bande B-001')).toBeTruthy();
  });

  it('expose aria-label sans shortCode', () => {
    render(<EntityAvatar species="porcelet" />);
    expect(screen.getByLabelText('Avatar porcelet')).toBeTruthy();
  });

  it('forward le className au wrapper', () => {
    const { container } = render(<EntityAvatar species="truie" className="my-avatar" />);
    expect(container.querySelector('.my-avatar')).not.toBeNull();
  });

  it('rend un SVG quand photoUrl est null', () => {
    const { container } = render(<EntityAvatar species="truie" photoUrl={null} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
