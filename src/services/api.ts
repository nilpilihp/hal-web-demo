import { 
  UploadResponse, 
  DownloadResponse, 
  StatusResponse, 
  HealthResponse,
  InferenceResult 
} from '../types';

const API_BASE_URL = 'https://ue7v1pazxb.execute-api.us-west-2.amazonaws.com';

export class HALAPIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'x-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async uploadVideo(videoFile: File, version: string): Promise<UploadResponse> {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const videoName = `web_upload_${timestamp}.mp4`;

    const uploadResponse = await fetch(
      `${API_BASE_URL}/upload/dev/${encodeURIComponent(videoName)}`,
      {
        method: 'GET',
        headers: {
          'x-api-version': version,
          'x-api-key': this.apiKey
        }
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Upload request failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadData: UploadResponse = await uploadResponse.json();

    // Upload to S3
    const putResponse = await fetch(uploadData.presigned_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: videoFile
    });

    if (!putResponse.ok) {
      throw new Error(`S3 upload failed: ${putResponse.status} ${putResponse.statusText}`);
    }

    return uploadData;
  }

  async getStatus(guid: string): Promise<StatusResponse> {
    const response = await fetch(
      `${API_BASE_URL}/status/dev/${encodeURIComponent(guid)}`,
      {
        method: 'GET',
        headers: { 'x-api-key': this.apiKey }
      }
    );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async downloadResults(guid: string): Promise<InferenceResult> {
    const downloadResponse = await fetch(
      `${API_BASE_URL}/download/dev/${encodeURIComponent(guid)}`,
      {
        method: 'GET',
        headers: { 'x-api-key': this.apiKey }
      }
    );

    if (!downloadResponse.ok) {
      const errorBody = await downloadResponse.text().catch(() => '');
      throw new Error(
        `Download request failed: ${downloadResponse.status} ${downloadResponse.statusText}${
          errorBody ? ' - ' + errorBody : ''
        }`
      );
    }

    const downloadData: DownloadResponse = await downloadResponse.json();
    
    if (!downloadData.presigned_url) {
      throw new Error('No presigned URL returned from API');
    }

    const resultsResponse = await fetch(downloadData.presigned_url);
    
    if (!resultsResponse.ok) {
      throw new Error(`Results fetch failed: ${resultsResponse.status} ${resultsResponse.statusText}`);
    }

    return resultsResponse.json();
  }

  async pollUntilComplete(
    guid: string, 
    onProgress: (status: string, attempt: number) => void,
    maxAttempts = 60,
    intervalMs = 30000
  ): Promise<void> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;
        
        try {
          const status = await this.getStatus(guid);
          onProgress(status.status, attempts);

          if (status.status === 'done') {
            clearInterval(interval);
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Processing timeout'));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, intervalMs);
    });
  }
}
