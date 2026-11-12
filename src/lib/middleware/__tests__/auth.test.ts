import type { NextRequest } from 'next/server';
import { validateApiKey } from '../auth';

const KEY = 'test-wave4-key-123';

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request('https://electiolab.test/api/admin/discrepancies', { headers }) as unknown as NextRequest;
}

describe('validateApiKey (fail-closed)', () => {
  const originalKey = process.env.WAVE4_API_KEY;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Simula produção: NODE_ENV não é 'development'
    (process.env as Record<string, string>).NODE_ENV = 'production';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalKey === undefined) delete process.env.WAVE4_API_KEY;
    else process.env.WAVE4_API_KEY = originalKey;
    (process.env as Record<string, string>).NODE_ENV = originalEnv as string;
  });

  it('nega quando WAVE4_API_KEY não existe (mesmo sem credencial)', () => {
    delete process.env.WAVE4_API_KEY;
    expect(validateApiKey(req())).toBe(false);
  });

  it('nega quando WAVE4_API_KEY não existe, mesmo com um header qualquer', () => {
    delete process.env.WAVE4_API_KEY;
    expect(validateApiKey(req({ authorization: 'Bearer qualquer' }))).toBe(false);
  });

  it('nega quando WAVE4_API_KEY é string vazia', () => {
    process.env.WAVE4_API_KEY = '';
    expect(validateApiKey(req({ authorization: 'Bearer ' }))).toBe(false);
  });

  it('nega sem credencial quando a chave está configurada', () => {
    process.env.WAVE4_API_KEY = KEY;
    expect(validateApiKey(req())).toBe(false);
  });

  it('nega chave errada (Bearer)', () => {
    process.env.WAVE4_API_KEY = KEY;
    expect(validateApiKey(req({ authorization: 'Bearer errada' }))).toBe(false);
  });

  it('nega chave de tamanho diferente (prefixo)', () => {
    process.env.WAVE4_API_KEY = KEY;
    expect(validateApiKey(req({ authorization: `Bearer ${KEY}x` }))).toBe(false);
  });

  it('aceita Bearer com a chave correta', () => {
    process.env.WAVE4_API_KEY = KEY;
    expect(validateApiKey(req({ authorization: `Bearer ${KEY}` }))).toBe(true);
  });

  it('aceita X-API-Key com a chave correta', () => {
    process.env.WAVE4_API_KEY = KEY;
    expect(validateApiKey(req({ 'x-api-key': KEY }))).toBe(true);
  });

  it('libera só em NODE_ENV=development, para trabalho local', () => {
    delete process.env.WAVE4_API_KEY;
    (process.env as Record<string, string>).NODE_ENV = 'development';
    expect(validateApiKey(req())).toBe(true);
  });
});
