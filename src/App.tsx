import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Power,
  Zap,
  Radio,
  Search,
  Image,
  ExternalLink,
  Activity,
  Clock,
} from 'lucide-react';
import { LiveService } from './services/liveService';
import {
  ConnectionState,
  MessageLog,
  GroundingSource,
} from './types';
import Visualizer from './components/Visualizer';
import CameraFeed from './components/CameraFeed';

const App: React.FC = () => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [latestSources, setLatestSources] = useState<
    GroundingSource[]
  >([]);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [latestOutputType, setLatestOutputType] = useState<
    string | null
  >(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<
    string | null
  >(null);

  const liveServiceRef = useRef<LiveService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if API key is provided via environment
  // process.env.API_KEY is replaced at build time by Vite
  const envApiKey = process.env.API_KEY;
  const hasEnvApiKey = Boolean(
    envApiKey && envApiKey !== 'undefined' && envApiKey.length > 10
  );

  // Debug logging on mount
  useEffect(() => {
    console.log('[Jarvis] App initialized');
    if (envApiKey) {
      const keyPreview =
        envApiKey.length > 20
          ? `${envApiKey.substring(0, 15)}...${envApiKey.slice(
              -4
            )} (length: ${envApiKey.length})`
          : envApiKey;
      console.log('[Jarvis] API Key preview:', keyPreview);
    } else {
      console.log('[Jarvis] API Key from env: NOT SET');
    }
    console.log('[Jarvis] Has valid API key:', hasEnvApiKey);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMessage = useCallback((msg: MessageLog) => {
    setMessages((prev) => [...prev, msg]);

    // Handle special message types
    if (msg.metadata?.image) {
      setLatestImage(msg.metadata.image);
    }
    if (msg.metadata?.sources && msg.metadata.sources.length > 0) {
      setLatestSources(msg.metadata.sources);
    }
    if (msg.metadata?.type) {
      setLatestOutputType(msg.metadata.type);
    }
  }, []);

  const handleConnect = async () => {
    setConnectionError(null);
    console.log('[Jarvis] Connect button clicked');

    // Initialize LiveService if needed
    if (!liveServiceRef.current) {
      liveServiceRef.current = new LiveService();
      liveServiceRef.current.onStateChange = (state) => {
        setConnectionState(state);
        if (state === ConnectionState.ERROR) {
          setConnectionError(
            'Connection failed. Check console for details.'
          );
        }
      };
      liveServiceRef.current.onMessage = handleMessage;
      liveServiceRef.current.onVolume = setVolume;
    }

    try {
      await liveServiceRef.current.connect();
    } catch (err) {
      console.error('[Jarvis] Connect error:', err);
      setConnectionError(
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const handleDisconnect = async () => {
    if (liveServiceRef.current) {
      await liveServiceRef.current.disconnect();
    }
  };

  const handleCameraFrame = useCallback(
    (base64: string) => {
      if (
        liveServiceRef.current &&
        connectionState === ConnectionState.CONNECTED
      ) {
        liveServiceRef.current.updateCameraFrame(base64);
      }
    },
    [connectionState]
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getOutputTypeBadge = (type: string | null) => {
    switch (type) {
      case 'search':
        return {
          icon: <Search size={12} />,
          label: 'SEARCH',
          color: 'var(--color-primary)',
        };
      case 'image_gen':
        return {
          icon: <Image size={12} />,
          label: 'IMAGE GEN',
          color: 'var(--color-accent)',
        };
      case 'reimagine':
        return {
          icon: <Image size={12} />,
          label: 'REIMAGINE',
          color: 'var(--color-warning)',
        };
      default:
        return null;
    }
  };

  // If no API key in environment, show auth screen
  if (!hasEnvApiKey && !apiKey) {
    return (
      <div className="auth-screen">
        <div className="auth-container">
          <div className="auth-logo">
            <div className="auth-logo-ring"></div>
            <Zap size={48} />
          </div>
          <h1 className="auth-title">JARVIS</h1>
          <p className="auth-subtitle">LIVE INTERFACE SYSTEM</p>
          <p className="auth-description">
            Neural link authentication required. Enter your Gemini API
            credentials to initialize the system.
          </p>
          <div className="auth-input-group">
            <label className="auth-label">API KEY</label>
            <input
              type="password"
              className="auth-input"
              placeholder="Enter your Gemini API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <button
            className="auth-button"
            onClick={() => {
              (
                window as unknown as {
                  process: { env: { API_KEY: string } };
                }
              ).process = {
                env: { API_KEY: apiKey },
              };
              setApiKey(apiKey + ' ');
              setTimeout(() => setApiKey(apiKey), 0);
            }}
            disabled={!apiKey.trim()}
          >
            <Power size={18} />
            INITIALIZE SYSTEM
          </button>
          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="auth-link"
          >
            Get API Key from Google AI Studio →
          </a>
        </div>
      </div>
    );
  }

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const badge = getOutputTypeBadge(latestOutputType);

  return (
    <div className="jarvis-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-text">JARVIS</span>
            <span className="logo-subtitle">
              LIVE INTERFACE SYSTEM
            </span>
          </div>
        </div>

        {/* System Status */}
        <div className="status-card">
          <div className="status-row">
            <span className="status-label">SYSTEM STATUS</span>
            <div
              className={`status-badge ${
                isConnected
                  ? 'status-online'
                  : isConnecting
                  ? 'status-connecting'
                  : connectionError
                  ? 'status-error'
                  : 'status-offline'
              }`}
            >
              <Radio size={10} />
              {isConnected
                ? 'CONNECTED'
                : isConnecting
                ? 'CONNECTING'
                : connectionError
                ? 'ERROR'
                : 'OFFLINE'}
            </div>
          </div>
          {connectionError && (
            <div className="status-error-msg">{connectionError}</div>
          )}
        </div>

        {/* Operation Log */}
        <div className="operation-log">
          <div className="section-header">
            <Activity size={14} />
            <span>OPERATION LOG</span>
          </div>
          <div className="log-entries">
            {messages.length === 0 ? (
              <div className="log-empty">
                Awaiting system activity...
              </div>
            ) : (
              messages.slice(-10).map((msg) => (
                <div
                  key={msg.id}
                  className={`log-entry log-entry-${msg.role}`}
                >
                  <div className="log-time">
                    <Clock size={10} />
                    {formatTime(msg.timestamp)}
                  </div>
                  <div className="log-text">{msg.text}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Connect/Disconnect Button */}
        <div className="sidebar-footer">
          {isConnected ? (
            <button
              className="control-button disconnect"
              onClick={handleDisconnect}
            >
              <MicOff size={18} />
              DISCONNECT
            </button>
          ) : (
            <button
              className="control-button connect"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              <Mic size={18} />
              {isConnecting ? 'CONNECTING...' : 'CONNECT'}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Row: Visualizer + Camera */}
        <div className="top-row">
          {/* Audio Input Matrix */}
          <div className="panel audio-panel">
            <div className="panel-header">
              <span className="panel-title">AUDIO INPUT MATRIX</span>
              <div
                className={`pulse-indicator ${
                  isConnected ? 'active' : ''
                }`}
              ></div>
            </div>
            <div className="visualizer-wrapper">
              <Visualizer volume={volume} active={isConnected} />
            </div>
          </div>

          {/* Video Stream */}
          <div className="panel video-panel">
            <div className="panel-header">
              <span className="panel-title">VIDEO STREAM</span>
              <button
                className="camera-toggle"
                onClick={() => setShowCamera(!showCamera)}
              >
                {showCamera ? (
                  <Camera size={14} />
                ) : (
                  <CameraOff size={14} />
                )}
              </button>
            </div>
            <div className="video-wrapper">
              {showCamera ? (
                <CameraFeed
                  onFrame={handleCameraFrame}
                  active={isConnected}
                />
              ) : (
                <div className="camera-disabled">
                  <CameraOff size={32} />
                  <span>Camera Disabled</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Output Display + Sources */}
        <div className="bottom-row">
          {/* Main Output Display */}
          <div className="panel output-panel">
            <div className="panel-header">
              <span className="panel-title">MAIN OUTPUT DISPLAY</span>
              {badge && (
                <div
                  className="output-badge"
                  style={{
                    borderColor: badge.color,
                    color: badge.color,
                  }}
                >
                  {badge.icon}
                  {badge.label}
                </div>
              )}
            </div>
            <div className="output-content">
              {latestImage ? (
                <div className="output-image-container">
                  <img
                    src={latestImage}
                    alt="Generated"
                    className="output-image"
                  />
                </div>
              ) : (
                <div className="output-placeholder">
                  <div className="placeholder-icon">
                    <Zap size={48} />
                  </div>
                  <span>Output will appear here</span>
                  <span className="placeholder-hint">
                    Ask Jarvis to search, create, or reimagine
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Grounding Sources */}
          <div className="panel sources-panel">
            <div className="panel-header">
              <span className="panel-title">GROUNDING SOURCES</span>
            </div>
            <div className="sources-content">
              {latestSources.length === 0 ? (
                <div className="sources-empty">
                  <Search size={24} />
                  <span>No sources yet</span>
                </div>
              ) : (
                <div className="sources-list">
                  {latestSources.map((source, index) => (
                    <a
                      key={index}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-item"
                    >
                      <span className="source-number">
                        {index + 1}
                      </span>
                      <span className="source-domain">
                        {new URL(source.uri).hostname.replace(
                          'www.',
                          ''
                        )}
                      </span>
                      <ExternalLink
                        size={12}
                        className="source-link-icon"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
