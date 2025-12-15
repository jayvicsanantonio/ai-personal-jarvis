# Jarvis - AI Personal Assistant

<div align="center">
  <h3>🤖 A Real-Time Multimodal AI Assistant</h3>
  <p>Built with React, TypeScript, and the Google Gemini Live API</p>
</div>

## Overview

Jarvis is a real-time, multimodal AI assistant inspired by the iconic J.A.R.V.I.S. from Marvel. It integrates live audio and video streaming with advanced AI capabilities, including:

- **🎙️ Real-time Voice Conversation** - Natural back-and-forth dialogue
- **🔍 Internet Search** - Grounded responses with Google Search
- **🎨 Image Generation** - Create illustrations from descriptions
- **📸 Image Reimagination** - Transform webcam photos with AI

## Tech Stack

| Technology    | Purpose                 |
| ------------- | ----------------------- |
| React 19      | Frontend framework      |
| TypeScript    | Type safety             |
| Vite          | Build tool & dev server |
| @google/genai | Gemini Live API SDK     |
| Lucide React  | Icons                   |

## Prerequisites

- **Node.js** (v18 or higher)
- **Gemini API Key** with billing enabled
  - Get one at [Google AI Studio](https://aistudio.google.com/)
  - [Billing Documentation](https://ai.google.dev/gemini-api/docs/billing)

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and add your API key:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run the app:**

   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Example Prompts

- **"Hello Jarvis, can you tell me today's weather in San Francisco?"** - Uses Google Search grounding
- **"Jarvis, can you create a photo of a futuristic city skyline at sunset?"** - Generates an image
- **"Jarvis, please take a photo of me and reimagine it as if I'm in a castle."** - Transforms webcam feed

### Controls

- **Connect/Disconnect** - Toggle the live connection
- **Camera Toggle** - Show/hide webcam feed
- **Message Log** - View all system outputs and generated content

## Architecture

```
src/
├── components/
│   ├── CameraFeed.tsx    # Webcam video component
│   └── Visualizer.tsx    # Audio visualization
├── services/
│   ├── audioUtils.ts     # PCM audio conversion
│   ├── liveService.ts    # Gemini Live API connection
│   └── toolService.ts    # Search & image tools
├── App.tsx               # Main application
├── index.tsx             # Entry point
├── index.css             # Styling
└── types.ts              # TypeScript definitions
```

## Google Cloud Configuration

### Option 1: Gemini Developer API (Recommended for Development)

Set `GEMINI_API_KEY` in your `.env.local` file with a key from [Google AI Studio](https://aistudio.google.com/).

### Option 2: Vertex AI (For Production)

Update the service files to use Vertex AI authentication:

```typescript
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GCP_PROJECT,
  location: process.env.GCP_LOCATION,
});
```

And add to `.env.local`:

```
GCP_PROJECT=your_project_id
GCP_LOCATION=us-central1
```

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by [addyosmani/jarvis](https://github.com/addyosmani/jarvis)
- Built with the [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)
