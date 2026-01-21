import React, { useState, useRef, useEffect } from 'react';
import { InferenceResult, ModelInfo, Subject } from './types';
import { HALAPIService } from './services/api';
import MetricCard from './components/MetricCard';
import StatusBlock from './components/StatusBlock';
import ModelSelector from './components/ModelSelector';
import Timeline from './components/Timeline';

const DEFAULT_MODELS: ModelInfo[] = [
  { version: '0.6.0', status: 'Offline', instances: 0, endpointName: '', offline: true },
  { version: '0.5.1', status: 'Offline', instances: 0, endpointName: '', offline: true },
  { version: '0.4.3', status: 'Offline', instances: 0, endpointName: '', offline: true },
];

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [selectedVersion, setSelectedVersion] = useState<string>('0.6.0');
  const [uploadMessage, setUploadMessage] = useState('Waiting for API key...');
  const [statusMessage, setStatusMessage] = useState('No updates yet.');
  const [downloadMessage, setDownloadMessage] = useState('Waiting...');
  const [currentGuid, setCurrentGuid] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [poseData, setPoseData] = useState<Record<string, number[]>>({});
  const [poseKeys, setPoseKeys] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiService = useRef<HALAPIService | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  useEffect(() => {
    // Prompt for API key on mount
    const key = prompt('Enter your HAL API key (or click Cancel to skip):');
    if (key && key.trim()) {
      setApiKey(key.trim());
      apiService.current = new HALAPIService(key.trim());
      setUploadMessage('API key set. Select a video to begin, or visualize a previous run.');
      addLog('API key set. Fetching available models...');
      fetchAvailableModels();
    } else {
      setApiKey('no-key-provided');
      setUploadMessage('No API key provided. Features will be limited.');
      addLog('No API key provided. Running in degraded mode.');
    }
  }, []);

  const fetchAvailableModels = async () => {
    if (!apiService.current) return;

    try {
      const health = await apiService.current.getHealth();
      const endpoints = health.endpoints || [];
      
      const models: ModelInfo[] = endpoints.map(ep => ({
        version: ep.version,
        status: ep.endpoint_status || 'Unknown',
        instances: ep.num_endpoint_instances || 0,
        endpointName: ep.endpoint_name || '',
        offline: false
      }));

      models.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
      
      setAvailableModels(models.length > 0 ? models : DEFAULT_MODELS);
      
      const preferred = models.find(m => m.status === 'InService' && m.instances > 0);
      if (preferred) {
        setSelectedVersion(preferred.version);
        addLog(`Available models loaded. Using ${preferred.version}`);
      } else if (models.length > 0) {
        setSelectedVersion(models[0].version);
        addLog(`Available models loaded. Defaulting to ${models[0].version}`);
      }
    } catch (error: any) {
      addLog(`Health check error: ${error.message}`);
      setAvailableModels(DEFAULT_MODELS);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setInferenceResult(null);
      setPoseData({});
      setPoseKeys([]);
      setUploadMessage(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB). Ready for upload.`);
      setStatusMessage('Video file selected.');
      setDownloadMessage('Waiting...');
      addLog(`Video selected: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !apiService.current) {
      addLog('Upload requires video and API key');
      return;
    }

    setIsUploading(true);
    setUploadMessage('Starting upload...');
    setStatusMessage('Uploading video...');
    setDownloadMessage('Awaiting processing...');
    addLog('Upload process started');

    try {
      const uploadData = await apiService.current.uploadVideo(videoFile, selectedVersion);
      setCurrentGuid(uploadData.guid);
      setUploadMessage(`Video uploaded. GUID: ${uploadData.guid}`);
      addLog(`Upload complete. GUID: ${uploadData.guid}`);
      
      setIsProcessing(true);
      setStatusMessage('Processing started...');
      addLog('Starting status polling');

      await apiService.current.pollUntilComplete(
        uploadData.guid,
        (status, attempt) => {
          setStatusMessage(`Status: ${status} (Check #${attempt})`);
          addLog(`Status check #${attempt}: ${status}`);
        }
      );

      setStatusMessage('Processing complete');
      setDownloadMessage('Downloading results...');
      addLog('Processing complete. Fetching results');

      const results = await apiService.current.downloadResults(uploadData.guid);
      applyInferenceResults(results);
      
    } catch (error: any) {
      setUploadMessage(`Error: ${error.message}`);
      addLog(`Upload/processing error: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleVisualize = async () => {
    const uid = prompt('Enter the UID (GUID) from a previous run:');
    if (!uid || !uid.trim()) {
      addLog('Visualization cancelled: No UID provided');
      return;
    }

    if (!apiService.current) {
      alert('API key required for visualization');
      return;
    }

    const trimmedUid = uid.trim();
    setIsProcessing(true);
    setUploadMessage('Fetching results from AWS...');
    setStatusMessage('Downloading from previous run...');
    setDownloadMessage('Loading results...');
    addLog(`Visualizing previous run: ${trimmedUid}`);

    try {
      const results = await apiService.current.downloadResults(trimmedUid);
      applyInferenceResults(results);
    } catch (error: any) {
      setUploadMessage(`Error: ${error.message}`);
      setStatusMessage('Visualization failed');
      setDownloadMessage(`Error: ${error.message}`);
      addLog(`Visualization error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyInferenceResults = (results: InferenceResult) => {
    setInferenceResult(results);
    
    const subject: Subject | undefined = results.subjects?.[0];
    if (subject) {
      setPoseData(subject.pose_df || {});
      setPoseKeys(subject.pose_keys || []);
      
      const formatConf = (val: number) => `${(val * 100).toFixed(0)}%`;
      setDownloadMessage(
        `Results ready (${results.version})\nRight: HAL=${subject.right_prediction} (${formatConf(subject.right_confidence)})\nLeft: HAL=${subject.left_prediction} (${formatConf(subject.left_confidence)})`
      );
      
      if (results.warnings?.length > 0) {
        setDownloadMessage(prev => prev + `\n⚠️ ${results.warnings.join(' | ')}`);
      }
      
      addLog(`Results applied. Version: ${results.version}`);
      
      // Auto-play video if available
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      setDownloadMessage('No subject data found in results');
      addLog('Results missing subject data');
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const renderLoop = () => {
    if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
      drawKeypoints();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
  };

  const startRenderLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    renderLoop();
  };

  const stopRenderLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Setup video event listeners for render loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => startRenderLoop();
    const handlePause = () => stopRenderLoop();
    const handleSeeked = () => {
      drawKeypoints();
      if (!video.paused) {
        startRenderLoop();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      stopRenderLoop();
    };
  }, [poseData, poseKeys, inferenceResult]);

  const drawKeypoints = () => {
    if (!videoRef.current || !canvasRef.current || !poseKeys.length || Object.keys(poseData).length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video display size
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate current frame
    const fps = inferenceResult?.video_metadata?.fps || 30;
    const currentFrame = Math.floor(video.currentTime * fps);
    const frameData = poseData[currentFrame] || poseData[currentFrame.toString()];

    if (!Array.isArray(frameData)) return;

    // Map pose data
    const pose: Record<string, number> = {};
    poseKeys.forEach((key, idx) => {
      pose[key] = frameData[idx];
    });

    // Scale coordinates
    const videoWidth = inferenceResult?.video_metadata?.width || video.videoWidth || 1;
    const videoHeight = inferenceResult?.video_metadata?.height || video.videoHeight || 1;
    const scaleX = canvas.width / videoWidth;
    const scaleY = canvas.height / videoHeight;

    // Draw bounding box
    if (pose.Box_X1 !== undefined && pose.Box_Y1 !== undefined && pose.Box_X2 !== undefined && pose.Box_Y2 !== undefined) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pose.Box_X1 * scaleX,
        pose.Box_Y1 * scaleY,
        (pose.Box_X2 - pose.Box_X1) * scaleX,
        (pose.Box_Y2 - pose.Box_Y1) * scaleY
      );
    }

    // Draw joints
    const joints = [
      { name: 'left_shoulder', x: 'X_left_shoulder', y: 'Y_left_shoulder' },
      { name: 'right_shoulder', x: 'X_right_shoulder', y: 'Y_right_shoulder' },
      { name: 'left_elbow', x: 'X_left_elbow', y: 'Y_left_elbow' },
      { name: 'right_elbow', x: 'X_right_elbow', y: 'Y_right_elbow' },
      { name: 'left_wrist', x: 'X_left_wrist', y: 'Y_left_wrist' },
      { name: 'right_wrist', x: 'X_right_wrist', y: 'Y_right_wrist' },
    ];

    const points = joints.map(j => ({
      x: pose[j.x] * scaleX,
      y: pose[j.y] * scaleY,
      name: j.name
    })).filter(p => !isNaN(p.x) && !isNaN(p.y));

    // Draw skeleton
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left arm
    if (points[0] && points[2] && points[4]) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.lineTo(points[4].x, points[4].y);
    }
    // Right arm
    if (points[1] && points[3] && points[5]) {
      ctx.moveTo(points[1].x, points[1].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.lineTo(points[5].x, points[5].y);
    }
    ctx.stroke();

    // Draw points
    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw finger tips (v0.6.0+)
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    ['left', 'right'].forEach((hand, handIdx) => {
      const wrist = points[handIdx === 0 ? 4 : 5];
      if (!wrist) return;

      fingers.forEach(finger => {
        const xKey = `X_${hand}_${finger}_tip`;
        const yKey = `Y_${hand}_${finger}_tip`;
        const x = pose[xKey];
        const y = pose[yKey];

        if (x !== undefined && y !== undefined && !isNaN(x) && !isNaN(y)) {
          const tipX = x * scaleX;
          const tipY = y * scaleY;

          // Line from wrist to tip
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wrist.x, wrist.y);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          // Tip point
          ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
          ctx.beginPath();
          ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  };

  const subject = inferenceResult?.subjects?.[0];

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-emerald-600 w-2 h-8 rounded-full"></span>
            HAL Web Demo
          </h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">
            Industrial Hand Activity Level Analyzer
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            id="video-upload"
            className="hidden"
          />
          <label
            htmlFor="video-upload"
            className="cursor-pointer px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-medium rounded-lg transition-colors border border-zinc-700"
          >
            Select Video
          </label>
          <button
            onClick={handleUpload}
            disabled={!videoFile || !apiKey || isUploading || isProcessing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:shadow-none"
          >
            {isUploading || isProcessing ? 'Processing...' : 'Upload to AWS'}
          </button>
          <button
            onClick={handleVisualize}
            disabled={!apiKey || isProcessing}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-sm font-medium rounded-lg transition-colors border border-zinc-700"
          >
            Visualize Previous Run
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Video & Timeline */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  controls
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 m-4 rounded-xl">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium">Awaiting Video Input</p>
              </div>
            )}
          </div>

          {inferenceResult && (
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Temporal Exertion Sequence
                </h3>
              </div>
              <Timeline reserved={true} />
            </div>
          )}

          {/* Status Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusBlock title="Upload" message={uploadMessage} />
            <StatusBlock title="Status" message={statusMessage} />
            <StatusBlock title="Download" message={downloadMessage} />
          </div>
        </div>

        {/* Right Column - Metrics & Model Selection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Model Selection */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
              Available Models
            </h3>
            <ModelSelector
              models={availableModels}
              selectedVersion={selectedVersion}
              onSelect={setSelectedVersion}
              disabled={isUploading || isProcessing}
            />
          </div>

          {/* Metrics */}
          {subject && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Right HAL"
                  value={subject.right_prediction ?? 'N/A'}
                  color={
                    typeof subject.right_prediction === 'number' && subject.right_prediction > 6.5
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }
                  subtitle={`Confidence: ${((subject.right_confidence || 0) * 100).toFixed(0)}% | ${subject.right_metrics?.n_reps ?? 0} reps | DC: ${(subject.right_metrics?.duty_cycle ?? 0).toFixed(1)} | Freq: ${(subject.right_metrics?.frequency_hz ?? 0).toFixed(1)} Hz`}
                  trend={
                    typeof subject.right_prediction === 'number' && subject.right_prediction > 6.5
                      ? 'EXCEEDS TLV'
                      : 'SAFE'
                  }
                />
                <MetricCard
                  label="Left HAL"
                  value={subject.left_prediction ?? 'N/A'}
                  color={
                    typeof subject.left_prediction === 'number' && subject.left_prediction > 6.5
                      ? 'text-red-400'
                      : 'text-blue-400'
                  }
                  subtitle={`Confidence: ${((subject.left_confidence || 0) * 100).toFixed(0)}% | ${subject.left_metrics?.n_reps ?? 0} reps | DC: ${(subject.left_metrics?.duty_cycle ?? 0).toFixed(1)} | Freq: ${(subject.left_metrics?.frequency_hz ?? 0).toFixed(1)} Hz`}
                  trend={
                    typeof subject.left_prediction === 'number' && subject.left_prediction > 6.5
                      ? 'EXCEEDS TLV'
                      : 'SAFE'
                  }
                />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                  Video Metadata
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-zinc-500 text-xs">Resolution</div>
                    <div className="text-white font-mono">
                      {inferenceResult.video_metadata.width} × {inferenceResult.video_metadata.height}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs">FPS</div>
                    <div className="text-white font-mono">{inferenceResult.video_metadata.fps.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs">Total Frames</div>
                    <div className="text-white font-mono">{inferenceResult.video_metadata.total_frames}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500 text-xs">Version</div>
                    <div className="text-white font-mono">{inferenceResult.version}</div>
                  </div>
                </div>
              </div>

              {inferenceResult.warnings && inferenceResult.warnings.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4">
                  <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">
                    ⚠️ Warnings
                  </div>
                  <div className="text-yellow-300 text-sm space-y-1">
                    {inferenceResult.warnings.map((warning, idx) => (
                      <div key={idx}>• {warning}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-800/50">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Live API Logs</h4>
            </div>
            <div className="max-h-64 overflow-y-auto p-4 bg-zinc-950 font-mono text-xs text-zinc-400 space-y-1">
              {logs.length === 0 ? (
                <div className="text-zinc-600">Logs will appear here...</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="hover:bg-zinc-900 px-2 py-1 rounded">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
