import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Type,
  FunctionDeclaration,
} from '@google/genai';
import {
  base64ToUint8Array,
  float32To16BitPCM,
  arrayBufferToBase64,
  pcm16ToAudioBuffer,
} from './audioUtils';
import {
  performSearch,
  generateImage,
  reimagineImage,
} from './toolService';
import { ConnectionState, MessageLog } from '../types';

// Tool Declarations
const searchTool: FunctionDeclaration = {
  name: 'search_google',
  description:
    'Search Google for up-to-date information, news, or facts.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query.' },
    },
    required: ['query'],
  },
};

const createTool: FunctionDeclaration = {
  name: 'create_illustration',
  description:
    'Create an illustration or image based on a description. Use this tool whenever the user asks to generate, create, or draw an image from scratch.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'Detailed description of the image to create.',
      },
    },
    required: ['prompt'],
  },
};

const reimagineTool: FunctionDeclaration = {
  name: 'reimagine_user',
  description:
    "Captures the current view from the user's camera to create a new AI-generated image based on it. Use this tool triggers for: 'take a photo of me', 'take a picture', 'capture me', 'selfie', 'make me look like...', 'turn me into...', or 'reimagine this scene'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description:
          "The visual description for the new image. If the user simply asks to 'take a photo' without specifying a style, use 'A high quality professional portrait of the person'.",
      },
    },
    required: ['prompt'],
  },
};

interface FunctionCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface ToolCall {
  functionCalls: FunctionCall[];
}

interface LiveSession {
  sendRealtimeInput: (input: {
    media: { mimeType: string; data: string };
  }) => void;
  sendToolResponse: (response: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: unknown;
    }>;
  }) => void;
  close?: () => void;
}

export class LiveService {
  private ai: GoogleGenAI;
  private session: LiveSession | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private currentCameraFrame: string | null = null;
  private isConnected: boolean = false;

  public onStateChange: (state: ConnectionState) => void = () => {};
  public onMessage: (msg: MessageLog) => void = () => {};
  public onVolume: (vol: number) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public updateCameraFrame(base64: string) {
    this.currentCameraFrame = base64;
    // Push frame to model to give it vision
    if (this.session && this.isConnected) {
      try {
        // Remove the Data URI prefix (e.g., "data:image/jpeg;base64,") to get raw base64 bytes
        const imageBase64 = base64.replace(
          /^data:image\/[a-z]+;base64,/,
          ''
        );
        this.session.sendRealtimeInput({
          media: {
            mimeType: 'image/jpeg',
            data: imageBase64,
          },
        });
      } catch (e) {
        console.warn('Failed to send camera frame:', e);
      }
    }
  }

  public async connect() {
    this.onStateChange(ConnectionState.CONNECTING);
    console.log('[Jarvis] Starting connection...');
    console.log('[Jarvis] API Key present:', !!process.env.API_KEY);

    try {
      this.inputAudioContext = new (window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext)({ sampleRate: 24000 });

      console.log('[Jarvis] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      console.log('[Jarvis] Microphone access granted');

      console.log('[Jarvis] Connecting to Gemini Live API...');
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('[Jarvis] WebSocket connected!');
            this.isConnected = true;
            this.onStateChange(ConnectionState.CONNECTED);
            this.setupAudioInput(
              stream,
              sessionPromise as Promise<LiveSession>
            );
          },
          onmessage: (msg: LiveServerMessage) => {
            if (
              !(msg as any).serverContent?.modelTurn?.parts?.[0]
                ?.inlineData?.data
            ) {
              console.log('[Jarvis] Control message received:', msg);
            }
            this.handleMessage(
              msg,
              sessionPromise as Promise<LiveSession>
            );
          },
          onclose: (event: CloseEvent) => {
            console.log('[Jarvis] WebSocket closed:', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
            });
            this.isConnected = false;
            this.onStateChange(ConnectionState.DISCONNECTED);
          },
          onerror: (err: ErrorEvent) => {
            console.error('[Jarvis] WebSocket error:', err);
            this.onStateChange(ConnectionState.ERROR);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            "You are Jarvis, a highly advanced AI assistant. You are helpful, precise, and have a futuristic personality. \n\nCRITICAL RULES:\n1. If the user asks to 'create', 'generate', or 'draw' an image from scratch, you MUST use the `create_illustration` tool.\n2. If the user asks to 'take a photo', 'capture me', 'selfie', 'picture of me', or 'reimagine' them, you MUST use the `reimagine_user` tool. Do NOT just describe the video feed textually. You must generate an actual image using the tool.\n3. For real-time information/facts, use `search_google`.\n4. Always confirm verbally when you are about to perform an action (e.g., 'Capturing that for you now...').",
          tools: [
            {
              functionDeclarations: [
                searchTool,
                createTool,
                reimagineTool,
              ],
            },
          ],
          realtimeInputConfig: {
            automaticActivityDetection: {
              silenceDurationMs: 500,
            },
          },
        },
      });

      this.session = (await sessionPromise) as LiveSession;
      console.log('[Jarvis] Session established successfully');
    } catch (error) {
      console.error('[Jarvis] Connection failed:', error);
      this.onStateChange(ConnectionState.ERROR);
    }
  }

  public async disconnect() {
    this.isConnected = false;

    if (this.inputSource) this.inputSource.disconnect();
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
    }

    if (this.session?.close) {
      try {
        this.session.close();
      } catch (e) {
        console.warn('Error closing session:', e);
      }
    }

    if (this.inputAudioContext) {
      try {
        await this.inputAudioContext.close();
      } catch (e) {
        console.warn('Error closing input audio context:', e);
      }
    }
    if (this.outputAudioContext) {
      try {
        await this.outputAudioContext.close();
      } catch (e) {
        console.warn('Error closing output audio context:', e);
      }
    }

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.session = null;
    this.onStateChange(ConnectionState.DISCONNECTED);
  }

  private setupAudioInput(
    stream: MediaStream,
    sessionPromise: Promise<LiveSession>
  ) {
    if (!this.inputAudioContext) return;

    this.inputSource =
      this.inputAudioContext.createMediaStreamSource(stream);
    // Using 1024 buffer size for lower latency (~64ms at 16kHz)
    // Smaller = more responsive but more CPU usage
    this.processor = this.inputAudioContext.createScriptProcessor(
      1024,
      1,
      1
    );

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolume(rms);

      const pcm16 = float32To16BitPCM(inputData);
      const base64 = arrayBufferToBase64(pcm16);

      // Only send if still connected
      if (this.isConnected) {
        sessionPromise.then((session) => {
          try {
            // console.log('[Jarvis] Sending audio chunk...'); // Too verbose for every chunk
            session.sendRealtimeInput({
              media: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64,
              },
            });
          } catch (e) {
            console.warn('Failed to send audio:', e);
          }
        });
      }
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(
    message: LiveServerMessage,
    sessionPromise: Promise<LiveSession>
  ) {
    // 1. Handle Tool Calls FIRST to prevent timeouts
    // Tool calls must be acknowledged immediately.
    const toolCall = (message as unknown as { toolCall?: ToolCall })
      .toolCall;
    if (toolCall) {
      for (const fc of toolCall.functionCalls) {
        let result: { result?: string; error?: string } = {
          result: 'ok',
        };

        try {
          if (fc.name === 'search_google') {
            const args = fc.args as { query: string };
            this.onMessage({
              id: fc.id,
              role: 'model',
              text: `Searching for: ${args.query}...`,
              timestamp: new Date(),
            });

            const searchResult = await performSearch(args.query);
            result = { result: searchResult.text }; // Send text back to model

            // Update UI with rich content
            this.onMessage({
              id: fc.id + '_res',
              role: 'system',
              text: 'Search Complete',
              timestamp: new Date(),
              metadata: {
                type: 'search',
                sources: searchResult.sources,
              },
            });
          } else if (fc.name === 'create_illustration') {
            const args = fc.args as { prompt: string };
            this.onMessage({
              id: fc.id,
              role: 'model',
              text: `Initiating visual cortex for: ${args.prompt}...`,
              timestamp: new Date(),
            });

            // Async generation to prevent timeout
            generateImage(args.prompt).then((imgResult) => {
              if (imgResult.imageUrl) {
                this.onMessage({
                  id: fc.id + '_res',
                  role: 'system',
                  text: args.prompt,
                  timestamp: new Date(),
                  metadata: {
                    type: 'image_gen',
                    image: imgResult.imageUrl,
                  },
                });
              } else {
                this.onMessage({
                  id: fc.id + '_err',
                  role: 'system',
                  text: `Visual generation failed: ${imgResult.error}`,
                  timestamp: new Date(),
                });
              }
            });

            // Immediate return to avoid deadline exceeded
            result = {
              result:
                'Image generation started in background. Inform the user it will be ready shortly.',
            };
          } else if (fc.name === 'reimagine_user') {
            const args = fc.args as { prompt?: string };
            const currentFrame = this.currentCameraFrame;

            if (!currentFrame) {
              result = {
                error:
                  'Camera frame not available. Please ensure camera is on.',
              };
              this.onMessage({
                id: fc.id + '_err',
                role: 'system',
                text: `Error: Camera frame missing. Cannot reimagine user.`,
                timestamp: new Date(),
              });
            } else {
              const promptText =
                args.prompt ||
                'A high quality professional portrait of the person';
              this.onMessage({
                id: fc.id,
                role: 'model',
                text: `Capturing webcam frame and processing with prompt: "${promptText}"...`,
                timestamp: new Date(),
              });

              // Clean up the frame data (remove header if present)
              const rawBase64 = currentFrame.replace(
                /^data:image\/\w+;base64,/,
                ''
              );

              // Async generation to prevent timeout
              reimagineImage(rawBase64, promptText).then(
                (imgResult) => {
                  if (imgResult.imageUrl) {
                    this.onMessage({
                      id: fc.id + '_res',
                      role: 'system',
                      text: promptText,
                      timestamp: new Date(),
                      metadata: {
                        type: 'reimagine',
                        image: imgResult.imageUrl,
                      },
                    });
                  } else {
                    this.onMessage({
                      id: fc.id + '_err',
                      role: 'system',
                      text: `Reimagine failed: ${imgResult.error}`,
                      timestamp: new Date(),
                    });
                  }
                }
              );

              // Immediate return
              result = {
                result:
                  'Photo captured and processing in background. Inform the user the image is rendering.',
              };
            }
          }
        } catch (e: unknown) {
          result = {
            error: e instanceof Error ? e.message : 'Unknown error',
          };
        }

        // Send Response back to model
        await sessionPromise.then((session) => {
          session.sendToolResponse({
            functionResponses: [
              {
                id: fc.id,
                name: fc.name,
                response: result,
              },
            ],
          });
        });
      }
    }

    // 2. Handle Audio (Processed after tools to avoid blocking tool responses)
    const serverContent = (
      message as unknown as {
        serverContent?: {
          modelTurn?: {
            parts?: Array<{ inlineData?: { data: string } }>;
          };
        };
      }
    ).serverContent;
    const audioData =
      serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      // Start audio with minimal delay (0.01s) to prevent gaps while keeping low latency
      const minStartTime = this.outputAudioContext.currentTime + 0.01;
      this.nextStartTime = Math.max(this.nextStartTime, minStartTime);

      const pcmBytes = base64ToUint8Array(audioData);
      const audioBuffer = await pcm16ToAudioBuffer(
        pcmBytes,
        this.outputAudioContext
      );

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    }
  }
}
