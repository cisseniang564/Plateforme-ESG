import api from '@/services/api';

/**
 * Sauvegarde sur le serveur (par utilisateur) des brouillons des pages de conformité.
 * Le navigateur garde une copie locale ; le serveur est la référence quand il a une version.
 */
export async function loadFramework<T extends object = Record<string, unknown>>(key: string): Promise<T | null> {
  try {
    const r = await api.get(`/framework-data/${key}`);
    const { last_saved: _ignored, data: _empty, ...payload } = (r.data ?? {}) as Record<string, unknown>;
    return Object.keys(payload).length > 0 ? (payload as T) : null;
  } catch {
    return null;
  }
}

export async function saveFramework(key: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    await api.post(`/framework-data/${key}`, { data });
    return true;
  } catch {
    return false;
  }
}
