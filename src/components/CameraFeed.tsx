import React, { useEffect, useRef, useCallback } from 'react';

interface CameraFeedProps {
  onFrame: (base64: string) => void;
  active: boolean;
}

const CameraFeed: React.FC<CameraFeedProps> = ({
  onFrame,
  active,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      onFrame(base64);
    }
  }, [onFrame]);

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    let interval: number;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(
          { video: { width: 640, height: 480 } }
        );

        if (!mounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (e: unknown) {
            // Ignore abort errors which happen during rapid component updates
            if (e instanceof Error && e.name !== 'AbortError') {
              console.error('Video playback error:', e);
            }
          }
        }

        // Start frame capture loop (2 FPS for better responsiveness)
        // Only capture frames when active (connected to Jarvis)
        interval = window.setInterval(() => {
          if (!mounted) return;
          if (active) {
            captureFrame();
          }
        }, 500);
      } catch (err) {
        if (mounted) {
          console.error('Camera access failed', err);
        }
      }
    };

    // Always start camera when component mounts
    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      clearInterval(interval);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [active, captureFrame]);

  return (
    <div className="camera-feed">
      <video
        ref={videoRef}
        muted
        playsInline
        className="camera-video"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="camera-indicator">
        <div className="camera-dot"></div>
        <span className="camera-label">Live Feed</span>
      </div>
      {/* HUD Overlays */}
      <div className="hud-corner hud-corner-tl"></div>
      <div className="hud-corner hud-corner-tr"></div>
      <div className="hud-corner hud-corner-bl"></div>
      <div className="hud-corner hud-corner-br"></div>
    </div>
  );
};

export default CameraFeed;
