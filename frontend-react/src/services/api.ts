import axios from 'axios';
import type { HealthResponse } from '../types/api';

// NeuroScope backend uses 8100 locally so it does not collide with other projects.
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100').replace(/\/$/, '');
export const http = axios.create({ baseURL, timeout: 180000 });

export const api = {
  async checkHealthWithLatency(): Promise<HealthResponse> {
    const started = performance.now();
    const response = await http.get('/health');
    return { ...response.data, status: response.data?.status || 'online', latencyMs: Math.round(performance.now() - started) };
  },
  async validateBraTS(formData: FormData) { return (await http.post('/api/v1/validate', formData)).data; },
  async validateMSD(formData: FormData) { return (await http.post('/api/v1/validate_msd', formData)).data; },
  async runSegmentation(runId: string) { return (await http.post(`/api/v1/segment/${encodeURIComponent(runId)}`)).data; },
  async getStudy(runId: string) { return (await http.get(`/api/v1/study/${encodeURIComponent(runId)}`)).data; },
  async getVolumeInfo(runId: string) { return (await http.get(`/api/v1/jobs/${encodeURIComponent(runId)}/volume-info`)).data; },
  async getMesh(runId: string, region: string) { return (await http.get(`/api/v1/jobs/${encodeURIComponent(runId)}/mesh`, { params: { region } })).data; },
  getPredictionDownloadUrl(runId: string) { return `${baseURL}/api/v1/jobs/${encodeURIComponent(runId)}/prediction`; },
  getReportDownloadUrl(runId: string) { return `${baseURL}/api/v1/jobs/${encodeURIComponent(runId)}/report`; },
  getSliceUrl(runId: string, modality: string, plane: string, index: number, params: Record<string, string | number | boolean> = {}) {
    const q = new URLSearchParams({ modality, plane, index: String(index), ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    return `${baseURL}/api/v1/jobs/${encodeURIComponent(runId)}/slice?${q.toString()}`;
  },
};
