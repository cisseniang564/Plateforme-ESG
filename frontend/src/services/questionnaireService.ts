import api from '@/services/api';
import { gaiaErrorMessage } from '@/services/gaiaService';

export type QStatus = 'prefilled' | 'validated' | 'to_complete';
export interface QSource { label: string; value: string; unit?: string | null; period?: string | null; verified: boolean }
export interface QQuestion {
  id: string;
  section?: string | null;
  text: string;
  answer_type: 'yes_no' | 'number' | 'text' | 'choice';
  answer: string | null;
  status: QStatus;
  confidence: 'high' | 'medium' | 'low' | null;
  sources: QSource[];
  note?: string | null;
}
export interface QCounts { total: number; validated: number; prefilled: number; to_complete: number }
export interface QSummary { id: string; title: string; client_name?: string | null; status: 'processing' | 'ready' | 'failed'; created_at: string | null; counts: QCounts }
export interface QDetail extends QSummary { error?: string | null; questions: QQuestion[] }

export const questionnaireErrorMessage = (e: unknown, fallback: string) => gaiaErrorMessage(e, fallback);

export async function listQuestionnaires(): Promise<QSummary[]> {
  return (await api.get('/questionnaires')).data.items ?? [];
}
export async function getQuestionnaire(id: string): Promise<QDetail> {
  return (await api.get(`/questionnaires/${id}`)).data;
}
export async function createQuestionnaire(input: { file?: File | null; pastedText?: string; clientName?: string }): Promise<QSummary> {
  const form = new FormData();
  if (input.file) form.append('file', input.file);
  if (input.pastedText) form.append('pasted_text', input.pastedText);
  if (input.clientName) form.append('client_name', input.clientName);
  return (await api.post('/questionnaires', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 })).data;
}
export async function saveAnswers(id: string, answers: Record<string, { answer: string | null; status: QStatus }>): Promise<QDetail> {
  return (await api.put(`/questionnaires/${id}/answers`, { answers })).data;
}
export async function deleteQuestionnaire(id: string): Promise<void> {
  await api.delete(`/questionnaires/${id}`);
}
export async function exportQuestionnaire(id: string, title: string): Promise<void> {
  const r = await api.get(`/questionnaires/${id}/export`, { responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reponses-${title.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
