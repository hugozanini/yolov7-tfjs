import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl
import Loader from "./components/loader";
import { Webcam } from "./utils/webcam";
import { renderBoxes } from "./utils/renderBox";
import { non_max_suppression_gpu } from "./utils/nonMaxSuppression";
import "./style/App.css";

const App = () => {
  const [loading, setLoading] = useState({ loading: true, progress: 0 });
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Performance dashboard states (throttled updates)
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [memory, setMemory] = useState({ tensors: 0, bytes: 0 });

  // Custom configuration states
  const [confThreshold, setConfThreshold] = useState(0.50);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [maxDetections, setMaxDetections] = useState(100);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webcamRef = useRef(new Webcam());
  const modelRef = useRef(null);
  const animationFrameId = useRef(null);

  // References to prevent stale closures inside requestAnimationFrame loop
  const confThresholdRef = useRef(confThreshold);
  const iouThresholdRef = useRef(iouThreshold);
  const maxDetectionsRef = useRef(maxDetections);
  const isPlayingRef = useRef(isPlaying);
  const isCameraOnRef = useRef(isCameraOn);

  // Stats computation references
  const frameCountRef = useRef(0);
  const latencyRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  // Update loop references when React states change
  useEffect(() => {
    confThresholdRef.current = confThreshold;
  }, [confThreshold]);

  useEffect(() => {
    iouThresholdRef.current = iouThreshold;
  }, [iouThreshold]);

  useEffect(() => {
    maxDetectionsRef.current = maxDetections;
  }, [maxDetections]);

  useEffect(() => {
    isCameraOnRef.current = isCameraOn;
  }, [isCameraOn]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    if (isPlaying && modelRef.current && isCameraOn) {
      if (videoRef.current) {
        videoRef.current.play().catch((err) => console.log("Play interrupted:", err));
      }
      animationFrameId.current = requestAnimationFrame(() => detectFrame(modelRef.current));
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [isPlaying]);

  const modelName = "yolov7";

  /**
   * Main inference and detection frame loop
   */
  const detectFrame = async (model) => {
    if (!isPlayingRef.current || !isCameraOnRef.current) {
      return;
    }

    if (!videoRef.current || videoRef.current.readyState !== 4) {
      animationFrameId.current = requestAnimationFrame(() => detectFrame(model));
      return;
    }

    const startInference = performance.now();
    const model_dim = [640, 640];
    
    // 1. Preprocess the video frame onto GPU
    const input = tf.tidy(() => {
      return tf.image
        .resizeBilinear(tf.browser.fromPixels(videoRef.current), model_dim)
        .div(255.0)
        .transpose([2, 0, 1])
        .expandDims(0);
    });

    try {
      // 2. Perform graph inference asynchronously
      const res = await model.executeAsync(input);

      // 3. Run GPU-accelerated NMS to avoid CPU bottlenecking
      const [boxes_data, scores_data, classes_data] = await non_max_suppression_gpu(
        res,
        confThresholdRef.current,
        iouThresholdRef.current,
        maxDetectionsRef.current
      );

      // 4. Render boxes on visual overlay canvas
      renderBoxes(canvasRef, boxes_data, scores_data, classes_data);

      // 5. Track performance and update telemetry panel
      const endInference = performance.now();
      latencyRef.current = endInference - startInference;

      frameCountRef.current += 1;
      const currentTime = performance.now();
      const timeElapsed = currentTime - lastFpsUpdateRef.current;
      
      // Throttle telemetry stats update to 3 times per second
      if (timeElapsed >= 300) {
        const calculatedFps = (frameCountRef.current * 1000) / timeElapsed;
        setFps(Math.round(calculatedFps));
        setLatency(latencyRef.current.toFixed(1));

        const mem = tf.memory();
        setMemory({
          tensors: mem.numTensors,
          bytes: mem.numBytesWebGL || mem.numBytes
        });

        frameCountRef.current = 0;
        lastFpsUpdateRef.current = currentTime;
      }

      // Dispose prediction tensor
      tf.dispose(res);
    } catch (error) {
      console.error("Frame detection failed:", error);
    } finally {
      // Clean up input tensor
      tf.dispose(input);
    }

    // Continue loop
    if (isPlayingRef.current && isCameraOnRef.current) {
      animationFrameId.current = requestAnimationFrame(() => detectFrame(model));
    }
  };

  // Load and warmup model on mount
  useEffect(() => {
    tf.loadGraphModel(`${window.location.origin}/${modelName}_web_model/model.json`, {
      onProgress: (fractions) => {
        setLoading({ loading: true, progress: fractions });
      },
    }).then(async (yolov7) => {
      modelRef.current = yolov7;
      
      // Warm up shader compiler and textures
      const dummyInput = tf.ones(yolov7.inputs[0].shape);
      try {
        const warmupResult = await yolov7.executeAsync(dummyInput);
        tf.dispose(warmupResult);
      } catch (err) {
        console.error("Shader warm-up failed:", err);
      } finally {
        tf.dispose(dummyInput);
      }

      setLoading({ loading: false, progress: 1 });
      
      // Request media stream and start detection
      webcamRef.current.open(videoRef, () => {
        animationFrameId.current = requestAnimationFrame(() => detectFrame(yolov7));
      });
    }).catch((err) => {
      console.error("TensorFlow Graph Model failed to load:", err);
    });

    // Cleanup resources
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      try {
        webcamRef.current.close(videoRef);
      } catch (e) {}
    };
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Camera toggle function
  const toggleCamera = () => {
    if (isCameraOn) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      webcamRef.current.close(videoRef);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
      setIsCameraOn(false);
      setIsPlaying(false);
      setFps(0);
      setLatency(0);
    } else {
      setIsCameraOn(true);
      setIsPlaying(true);
      webcamRef.current.open(videoRef, () => {
        animationFrameId.current = requestAnimationFrame(() => detectFrame(modelRef.current));
      });
    }
  };

  const togglePlayPause = () => {
    if (!isCameraOn) return;
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>YOLOv7 Real-Time Object Detection</h1>
        <div className="badge">
          {loading.loading ? "Loading Web Model..." : "WebGL Accelerated"}
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Viewport Card */}
        <div className="card viewport-card">
          <div className="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            Live Camera Feed
          </div>

          <div className="content-wrapper">
            {loading.loading && (
              <Loader>Downloading model: {(loading.progress * 100).toFixed(0)}%</Loader>
            )}
            <video
              autoPlay
              playsInline
              muted
              ref={videoRef}
              style={{ display: isCameraOn ? "block" : "none" }}
            />
            <canvas
              width={640}
              height={640}
              ref={canvasRef}
              style={{ display: isCameraOn ? "block" : "none" }}
            />
            {!isCameraOn && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "#94a3b8",
                gap: "12px"
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"></path>
                  <path d="m23 7-6 6 6 6V7z"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <p style={{ fontWeight: 500 }}>Webcam stream is paused</p>
              </div>
            )}
          </div>

          <div className="viewport-controls">
            <button
              onClick={togglePlayPause}
              disabled={!isCameraOn}
              className={`btn ${isPlaying ? "btn-secondary" : "btn-primary"}`}
              title={isPlaying ? "Pause detection" : "Play detection"}
            >
              {isPlaying ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                  </svg>
                  Pause Loop
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21"></polygon>
                  </svg>
                  Resume Loop
                </>
              )}
            </button>

            <button
              onClick={toggleCamera}
              className={`btn ${isCameraOn ? "btn-danger" : "btn-primary"}`}
            >
              {isCameraOn ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  Stop Cam
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  Start Cam
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="right-sidebar">
          {/* Performance Dashboard */}
          <div className="card">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Performance Dashboard
            </div>
            
            <div className="stats-grid">
              <div className="stat-item stat-fps">
                <span className="stat-label">FPS</span>
                <span className="stat-val">{fps}</span>
              </div>
              <div className="stat-item stat-latency">
                <span className="stat-label">Inference Time</span>
                <span className="stat-val">{latency} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>ms</span></span>
              </div>
              <div className="stat-item">
                <span className="stat-label">WebGL Memory</span>
                <span className="stat-val" style={{ fontSize: "1.1rem" }}>{formatBytes(memory.bytes)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">GPU Tensors</span>
                <span className="stat-val" style={{ fontSize: "1.1rem" }}>{memory.tensors}</span>
              </div>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="card">
            <div className="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              Hyperparameter Settings
            </div>

            <div className="slider-group">
              <div className="slider-container">
                <label className="slider-label">
                  <span>Confidence Threshold</span>
                  <span className="slider-val">{(confThreshold * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="1.00"
                  step="0.01"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="slider-input"
                />
              </div>

              <div className="slider-container">
                <label className="slider-label">
                  <span>IoU Threshold</span>
                  <span className="slider-val">{iouThreshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="1.00"
                  step="0.01"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  className="slider-input"
                />
              </div>

              <div className="slider-container">
                <label className="slider-label">
                  <span>Max Detections</span>
                  <span className="slider-val">{maxDetections}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={maxDetections}
                  onChange={(e) => setMaxDetections(parseInt(e.target.value))}
                  className="slider-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
