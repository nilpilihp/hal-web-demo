// API Types
export interface VideoMetadata {
  fps: number;
  total_frames: number;
  width: number;
  height: number;
}

export interface Subject {
  subject_id: number;
  track_id: number;
  left_prediction: number;
  left_confidence: number;
  right_prediction: number;
  right_confidence: number;
  track_length: number;
  pose_keys: string[];
  pose_df: Record<string, number[]>;
  left_metrics?: {
    hal_score: number;
    duty_cycle: number;
    frequency_hz: number;
    n_reps: number;
    dominant_freq: number;
  };
  right_metrics?: {
    hal_score: number;
    duty_cycle: number;
    frequency_hz: number;
    n_reps: number;
    dominant_freq: number;
  };
}

export interface InferenceResult {
  version: string;
  status: string;
  message: string;
  warnings: string[];
  video_metadata: VideoMetadata;
  subjects: Subject[];
}

export interface UploadResponse {
  guid: string;
  presigned_url: string;
}

export interface DownloadResponse {
  presigned_url: string;
}

export interface StatusResponse {
  status: string;
}

export interface EndpointInfo {
  version: string;
  endpoint_status: string;
  num_endpoint_instances: number;
  endpoint_name?: string;
}

export interface HealthResponse {
  endpoints: EndpointInfo[];
}

// UI Types
export interface ModelInfo {
  version: string;
  status: string;
  instances: number;
  endpointName: string;
  offline: boolean;
}
