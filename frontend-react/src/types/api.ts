// Shared frontend contracts. API payloads remain permissive while the backend evolves.
export type ActiveTab = 'dashboard' | 'upload' | 'viewer' | 'results' | 'reports';
export type ValidationResponse = any;
export type StudyDetails = any;
export type SegmentationResponse = any;
export type VolumeInfoResponse = any;
export type MeshResponse = any;
export type SliceResponse = any;
export interface HealthResponse {
  status: 'online' | 'offline' | string;
  latencyMs: number;
  data?: any;
  [key: string]: any;
}
