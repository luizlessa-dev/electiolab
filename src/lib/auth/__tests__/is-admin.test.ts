import { isAdminUser } from '../is-admin';

describe('isAdminUser', () => {
  it('aceita app_metadata.is_admin === true', () => {
    expect(isAdminUser({ app_metadata: { is_admin: true } })).toBe(true);
  });

  it('ignora user_metadata.role (editável pelo próprio usuário)', () => {
    expect(
      isAdminUser({ app_metadata: {}, user_metadata: { role: 'admin' } } as never)
    ).toBe(false);
  });

  it('rejeita is_admin com valor não booleano true', () => {
    expect(isAdminUser({ app_metadata: { is_admin: 'true' } })).toBe(false);
    expect(isAdminUser({ app_metadata: { is_admin: 1 } })).toBe(false);
  });

  it('rejeita sem app_metadata, usuário nulo ou ausente', () => {
    expect(isAdminUser({})).toBe(false);
    expect(isAdminUser({ app_metadata: null })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });
});
