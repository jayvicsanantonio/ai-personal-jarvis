# Jarvis AI Personal Assistant - Onboarding Guide

Welcome to the Jarvis AI Personal Assistant project! This guide will walk you through the entire implementation, explaining **what** we built, **why** we made certain choices, and **how** everything works together.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Implementation Deep Dive](#implementation-deep-dive)
6. [Alternative Approaches](#alternative-approaches)
7. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
8. [Next Steps & Improvements](#next-steps--improvements)

---

## Project Overview

### What is Jarvis?

Jarvis is a real-time, multimodal AI assistant that you can **talk to** and **see you** through your webcam. It uses Google's Gemini Live API to enable:

- **Voice Conversations**: Speak naturally and hear audio responses
- **Visual Understanding**: The AI can see your webcam feed and respond to visual context
- **Google Search**: Get real-time information from the web
- **Image Generation**: Create images from text descriptions
- **Image Reimagination**: Transform your appearance based on prompts (e.g., "make me look like a superhero")

### How Does It Work?

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Microphone │  │   Webcam    │  │      React UI           │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   LiveService                              │ │
│  │  • Captures audio (16kHz PCM)                              │ │
│  │  • Captures video frames (JPEG, 2 FPS)                     │ │
│  │  • Manages WebSocket connection                            │ │
│  │  • Plays audio responses                                   │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────────┘
                             │ WebSocket (wss://)
                             ▼
            ┌────────────────────────────────────┐
            │       Google Gemini Live API       │
            │  gemini-2.5-flash-native-audio-*   │
            └────────────────────────────────────┘
```

---

## Technology Stack

### Core Technologies

| Technology        | Purpose      | Why We Chose It                                                         |
| ----------------- | ------------ | ----------------------------------------------------------------------- |
| **React 19**      | UI Framework | Latest React with improved rendering, hooks, and concurrent features    |
| **TypeScript**    | Type Safety  | Catches bugs at compile time, better IDE support, self-documenting code |
| **Vite**          | Build Tool   | Extremely fast HMR (Hot Module Replacement), modern ESM-based bundling  |
| **@google/genai** | Gemini SDK   | Official SDK for Google's Gemini API with Live API support              |
| **lucide-react**  | Icons        | Lightweight, tree-shakeable icon library                                |

### Why Not Other Options?

#### Build Tools

- **Why Vite over Create React App (CRA)?**

  - CRA is deprecated and no longer maintained
  - Vite is 10-100x faster for development
  - Native ESM support means no bundling during dev

- **Why Vite over Next.js?**
  - This is a client-only app (no server-side rendering needed)
  - Simpler setup for a single-page application
  - No backend routes required

#### UI Framework

- **Why React over Vue/Svelte/Angular?**
  - React 19 has excellent TypeScript support
  - Large ecosystem and community
  - Hooks provide clean state management
  - Team familiarity (most common choice)

#### Styling

- **Why Vanilla CSS over Tailwind?**
  - Full control over design system
  - No additional build complexity
  - Custom CSS variables for theming
  - Easier to create complex animations

---

## Project Structure

```
ai-personal-jarvis/
├── index.html              # Entry HTML with custom fonts
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── .env                    # Environment variables (git-ignored)
├── .env.example            # Template for environment variables
├── .gitignore              # Git ignore patterns
├── README.md               # Project overview
├── ONBOARDING.md           # This file!
└── src/
    ├── index.tsx           # React entry point
    ├── App.tsx             # Main application component
    ├── index.css           # Global styles and theme
    ├── types.ts            # TypeScript type definitions
    ├── components/
    │   ├── Visualizer.tsx  # Audio visualization canvas
    │   └── CameraFeed.tsx  # Webcam capture component
    └── services/
        ├── liveService.ts  # Gemini Live API connection
        ├── toolService.ts  # Search & image generation
        └── audioUtils.ts   # Audio format conversion
```

### File Responsibilities

| File             | What It Does                                              | Key Concepts                             |
| ---------------- | --------------------------------------------------------- | ---------------------------------------- |
| `liveService.ts` | Heart of the app - manages WebSocket connection to Gemini | WebSocket, AudioContext, Event callbacks |
| `toolService.ts` | Executes AI tool calls (search, image gen)                | API integration, Async/await             |
| `audioUtils.ts`  | Converts between browser and API audio formats            | PCM audio, Base64 encoding               |
| `App.tsx`        | Main UI layout and state management                       | React hooks, Conditional rendering       |
| `index.css`      | All styling with CSS variables                            | CSS Grid, Flexbox, Animations            |

---

## Getting Started

### Prerequisites

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **A Gemini API Key** - [Get one from Google AI Studio](https://aistudio.google.com/)
3. **A modern browser** - Chrome, Firefox, or Edge (Safari has WebRTC limitations)

### Step-by-Step Setup

#### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/jayvicsanantonio/ai-personal-jarvis.git
cd ai-personal-jarvis

# Install dependencies
npm install
```

**What happens during `npm install`?**

- Downloads React, TypeScript, Vite, and the Gemini SDK
- Creates `node_modules/` folder with all dependencies
- Generates `package-lock.json` for reproducible builds

#### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API key
# GEMINI_API_KEY=your_api_key_here
```

**Why use `.env` files?**

- Keeps secrets out of source code
- Different values for dev/prod environments
- `.gitignore` prevents accidental commits

**Important:** The `.env` file must be named exactly `.env` (not `.env.local`) for Vite to load it with our configuration.

#### Step 3: Run the Development Server

```bash
npm run dev
```

This starts Vite's dev server at `http://localhost:3000`. Open this URL in your browser.

**What happens when you run `npm run dev`?**

1. Vite reads `vite.config.ts`
2. Loads environment variables from `.env`
3. Injects `GEMINI_API_KEY` into the app via `process.env.API_KEY`
4. Starts a WebSocket server for Hot Module Replacement
5. Serves your app with instant updates on file changes

#### Step 4: Grant Permissions

When you click "Connect":

1. **Microphone permission** - Required for voice input
2. **Camera permission** - Required for video streaming

---

## Implementation Deep Dive

### 1. Environment Variable Handling (`vite.config.ts`)

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    // ...
  };
});
```

**Why this approach?**

- Vite normally only exposes variables prefixed with `VITE_`
- We use `loadEnv()` to load ALL variables, then manually inject the one we need
- `JSON.stringify()` is critical - it wraps the value in quotes for proper JavaScript injection

**Alternative approaches:**

1. **Prefix with `VITE_`**: Use `VITE_GEMINI_API_KEY` - simpler but exposes naming convention
2. **Runtime fetch**: Load key from a backend API - more secure for production

### 2. Type Definitions (`types.ts`)

```typescript
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}
```

**Why use enums?**

- Prevents typos (can't write `'conected'` by accident)
- IDE autocomplete shows all valid options
- Single source of truth for state values

**Why not just strings?**

- Strings are error-prone
- No compile-time checking
- Harder to refactor

### 3. Audio Utilities (`audioUtils.ts`)

The browser and Gemini API use different audio formats:

| Source/Destination | Format              | Sample Rate |
| ------------------ | ------------------- | ----------- |
| Browser Microphone | Float32 (-1 to 1)   | 16,000 Hz   |
| Gemini API Input   | 16-bit PCM (Base64) | 16,000 Hz   |
| Gemini API Output  | 16-bit PCM (Base64) | 24,000 Hz   |
| Browser Speakers   | Float32 (-1 to 1)   | 24,000 Hz   |

**Key function: `float32To16BitPCM`**

```typescript
export function float32To16BitPCM(
  float32Array: Float32Array
): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(
      i * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }
  return buffer;
}
```

**What this does:**

1. Creates a buffer twice the size (16-bit = 2 bytes per sample)
2. Clamps values between -1 and 1
3. Scales to 16-bit integer range (-32768 to 32767)
4. Uses little-endian byte order (`true` parameter)

### 4. Live Service (`liveService.ts`)

This is the core of the application. Let's break it down:

#### WebSocket Connection

```typescript
const sessionPromise = this.ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  callbacks: {
    onopen: () => {
      /* ... */
    },
    onmessage: (msg) => {
      /* ... */
    },
    onclose: () => {
      /* ... */
    },
    onerror: (err) => {
      /* ... */
    },
  },
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: 'You are Jarvis...',
    tools: [
      /* function declarations */
    ],
  },
});
```

**Why WebSocket over REST?**

- Real-time bidirectional communication
- Low latency for audio streaming
- Server can push responses as they're generated
- No polling required

#### Audio Input Processing

```typescript
this.processor.onaudioprocess = (e) => {
  const inputData = e.inputBuffer.getChannelData(0);
  const pcm16 = float32To16BitPCM(inputData);
  const base64 = arrayBufferToBase64(pcm16);

  session.sendRealtimeInput({
    media: { mimeType: 'audio/pcm;rate=16000', data: base64 },
  });
};
```

**What happens here:**

1. `onaudioprocess` fires every ~250ms with audio data
2. We convert browser's Float32 to 16-bit PCM
3. Encode as Base64 for transmission
4. Send to Gemini via WebSocket

**Note:** `ScriptProcessorNode` is deprecated. The modern alternative is `AudioWorkletNode`, but it requires more complex setup with separate Worker files.

#### Tool Handling

When Gemini wants to use a tool (search, image gen), it sends a `toolCall` message:

```typescript
if (message.toolCall) {
  for (const fc of message.toolCall.functionCalls) {
    if (fc.name === 'search_google') {
      const result = await performSearch(fc.args.query);
      // Send result back to model
    }
  }
}
```

**Why async tool execution?**

- Search and image generation take time
- We don't want to block audio playback
- Model continues speaking while tools execute

### 5. Tool Service (`toolService.ts`)

#### Google Search with Grounding

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: query,
  config: {
    tools: [{ googleSearch: {} }],
  },
});
```

**What is "grounding"?**

- The model searches the web and cites sources
- Response includes `groundingMetadata` with source URLs
- Ensures factual, up-to-date information

#### Image Generation

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: prompt,
  config: {
    responseModalities: ['image', 'text'],
  },
});
```

**Why `gemini-2.5-flash-image`?**

- Specifically trained for image generation
- Returns images as Base64 inline data
- Supports text-to-image and image-to-image

### 6. React Components

#### App State Management

```typescript
const [connectionState, setConnectionState] =
  useState<ConnectionState>(ConnectionState.DISCONNECTED);
const [messages, setMessages] = useState<MessageLog[]>([]);
const liveServiceRef = useRef<LiveService | null>(null);
```

**Why `useRef` for LiveService?**

- `useState` would cause re-renders on every message
- `useRef` persists across renders without triggering updates
- Service instance is mutable

**Alternative: State management libraries**

- **Redux**: Overkill for this app size
- **Zustand**: Good lightweight option
- **Jotai**: Atom-based state, good for derived state

#### Callback Optimization

```typescript
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
```

**Why `useCallback`?**

- Prevents unnecessary re-renders of child components
- Memoizes the function reference
- Only recreates when `connectionState` changes

---

## Alternative Approaches

### 1. Backend Architecture

**Current approach:** Client-only (API key in browser)

**Alternative:** Backend proxy server

```
Browser → Your Backend → Gemini API
```

**Pros of backend approach:**

- API key never exposed to client
- Can add rate limiting and auth
- Better for production deployments

**Cons:**

- More infrastructure to maintain
- Additional latency
- More complex deployment

### 2. State Management

**Current approach:** React hooks + refs

**Alternatives:**

| Library           | When to Use                              |
| ----------------- | ---------------------------------------- |
| **Zustand**       | Simple global state, minimal boilerplate |
| **Redux Toolkit** | Complex state with time-travel debugging |
| **Jotai**         | Atomic state, good for derived values    |
| **React Query**   | Server state caching and sync            |

### 3. Audio Processing

**Current approach:** `ScriptProcessorNode` (deprecated)

**Modern alternative:** `AudioWorkletNode`

```javascript
// audioProcessor.worklet.js
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    // Process audio here
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
```

**Why we didn't use it:**

- Requires separate worklet file
- More complex build setup
- `ScriptProcessorNode` still works and is simpler for prototyping

### 4. Styling

**Current approach:** Vanilla CSS with CSS variables

**Alternatives:**

| Approach              | Pros                         | Cons                          |
| --------------------- | ---------------------------- | ----------------------------- |
| **Tailwind CSS**      | Fast prototyping, consistent | Learning curve, verbose HTML  |
| **CSS Modules**       | Scoped by default            | More files to manage          |
| **Styled Components** | CSS-in-JS, dynamic           | Runtime overhead, bundle size |
| **Sass/SCSS**         | Nesting, mixins              | Build step required           |

---

## Common Issues & Troubleshooting

### Issue: "API key not valid"

**Symptoms:** WebSocket connects then immediately closes

**Solution:**

1. Check `.env` file has correct key
2. Restart dev server after changing `.env`
3. Clear browser cache (Cmd+Shift+R)
4. Verify key works: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"`

### Issue: Shell environment variable overriding `.env`

**Symptoms:** Different API key being used than expected

**Solution:**

```bash
# Check if set in shell
echo $GEMINI_API_KEY

# If set, unset it
unset GEMINI_API_KEY

# Or remove from ~/.zshrc or ~/.bashrc
```

### Issue: "model not found" errors

**Symptoms:** 404 errors for model names

**Solution:** Model names change frequently. Check the [Gemini models documentation](https://ai.google.dev/gemini-api/docs/models) for current names.

### Issue: No audio output

**Symptoms:** Jarvis doesn't speak back

**Possible causes:**

1. Browser audio not enabled
2. `AudioContext` suspended (auto-play policy)
3. Volume muted

**Solution:** Click somewhere on the page first (user interaction unlocks audio)

### Issue: Camera not showing

**Symptoms:** Black video feed

**Solutions:**

1. Check browser permissions (camera icon in address bar)
2. No other app using camera
3. Try in incognito mode (extension conflicts)

---

## Next Steps & Improvements

### Easy Improvements

1. **Add a loading spinner** during connection
2. **Show volume level indicator** for microphone
3. **Add conversation history** that persists across sessions
4. **Add dark/light theme toggle**

### Medium Difficulty

1. **Replace ScriptProcessorNode** with AudioWorkletNode
2. **Add speech-to-text display** showing what you said
3. **Implement user preferences** storage (LocalStorage)
4. **Add keyboard shortcuts** (Space to talk, Esc to disconnect)

### Advanced

1. **Add backend proxy** for API key security
2. **Implement streaming text display** as Jarvis speaks
3. **Add multi-language support**
4. **Deploy with Docker** and CI/CD pipeline
5. **Add unit and integration tests**

---

## Resources

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [React 19 Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## Questions?

If something in this guide is unclear or you encounter issues not covered here, feel free to:

1. Open a GitHub issue
2. Check the browser console for error messages
3. Review the source code comments

Happy coding! 🚀
