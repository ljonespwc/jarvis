# JARVIS Voice Todo Assistant

Voice-controlled todo.txt desktop application using Layercode and OpenAI.

## Architecture

- **Desktop App**: Electron with Layercode voice integration
- **Backend**: Vercel serverless functions for webhook processing
- **Voice Processing**: Layercode speech-to-text
- **AI**: OpenAI GPT-4o-mini for natural language understanding

## Setup

### 1. Environment Variables (Vercel)
```
OPENAI_API_KEY=your_openai_key
LAYERCODE_API_KEY=your_layercode_key  
LAYERCODE_PIPELINE_ID=your_pipeline_id
```

### 2. Layercode Configuration
- Webhook URL: `https://your-vercel-app.vercel.app/api/webhook`
- Auth Endpoint: `https://your-vercel-app.vercel.app/api/authorize`
- Webhook Events: `message`, `session.start`

### 3. Desktop App
```bash
npm install
npm start
```

## Voice Commands

- "What needs my attention?" - Get top priority tasks
- "Add [task name]" - Add new task
- "Mark [task] done" - Complete task
- "Read my list" - List all tasks

## Development

The webhook logic processes voice commands and maintains a simple in-memory todo list. In production, you'd replace this with a proper database.