// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { assertNoUUID, containsUUID, UUID_REGEX, useNoUUID } from './uuid-guard';

describe('uuidGuard — UUID_REGEX', () => {
  it('matches a canonical UUID v4', () => {
    expect(UUID_REGEX.test('7e3f2a4c-1234-5678-9abc-def012345678')).toBe(true);
  });

  it('matches an UUID embedded in text', () => {
    expect(UUID_REGEX.test('Bande #7e3f2a4c-1234-5678-9abc-def012345678 ok')).toBe(true);
  });

  it('does not match short codes (L5RM, T-001, B45-F)', () => {
    expect(UUID_REGEX.test('L5RM')).toBe(false);
    expect(UUID_REGEX.test('T-001')).toBe(false);
    expect(UUID_REGEX.test('B45-F')).toBe(false);
    expect(UUID_REGEX.test('B-2026-05-02-L5RM')).toBe(false);
  });

  it('does not match plain product names', () => {
    expect(UUID_REGEX.test('Ivermectine')).toBe(false);
    expect(UUID_REGEX.test('Vermifuge injectable')).toBe(false);
  });
});

describe('uuidGuard — containsUUID', () => {
  it('returns true when UUID is present', () => {
    expect(containsUUID('id=7e3f2a4c-1234-5678-9abc-def012345678')).toBe(true);
  });
  it('returns false when no UUID', () => {
    expect(containsUUID('Bande L5RM')).toBe(false);
  });
});

describe('uuidGuard — assertNoUUID', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleError.mockRestore();
  });

  it('logs an error in development when UUID is detected', () => {
    process.env.NODE_ENV = 'development';
    assertNoUUID('Stock 7e3f2a4c-1234-5678-9abc-def012345678 critique', 'test');
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0][0]).toContain('[UUID-GUARD]');
    expect(consoleError.mock.calls[0][0]).toContain('test');
  });

  it('does NOT log in production (no-op)', () => {
    process.env.NODE_ENV = 'production';
    assertNoUUID('Stock 7e3f2a4c-1234-5678-9abc-def012345678 critique', 'test');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does NOT log when text has no UUID even in dev', () => {
    process.env.NODE_ENV = 'development';
    assertNoUUID('Stock Ivermectine critique', 'test');
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('uuidGuard — useNoUUID hook', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleError.mockRestore();
  });

  it('triggers assertNoUUID via useEffect on mount', () => {
    process.env.NODE_ENV = 'development';
    renderHook(() =>
      useNoUUID('Stock 7e3f2a4c-1234-5678-9abc-def012345678 ko', 'AuditView'),
    );
    expect(consoleError).toHaveBeenCalled();
    expect(consoleError.mock.calls[0][0]).toContain('AuditView');
  });

  it('does not log if text is clean', () => {
    process.env.NODE_ENV = 'development';
    renderHook(() => useNoUUID('Stock OK', 'AuditView'));
    expect(consoleError).not.toHaveBeenCalled();
  });
});
