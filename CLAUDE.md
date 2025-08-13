# JARVIS Voice Todo - Claude Code Project Context

## Project Overview
Voice-controlled desktop todo.txt application using Electron, Layercode SDK, and OpenAI GPT-4o-mini.

**Core Problem**: Manual re-reading of todo.txt files causes poor task awareness and missed items.
**Solution**: Voice-first interface for ambient awareness - "Hey JARVIS, what needs my attention?"

## Technical Stack
- **Frontend**: Electron (cross-platform desktop)
- **Voice Processing**: Layercode Node.js SDK (@layercode/node-server-sdk)
- **AI**: OpenAI GPT-4o-mini for intent recognition and natural responses
- **File Format**: Simple todo.txt (active tasks + [DONE] completed tasks)
- **Backup**: Automatic versioned backups before changes

## Essential Voice Commands
- "What needs my attention?" → Top 3-5 priority tasks
- "Add [task]" → Append new task
- "Mark [task] done" → Complete task with timestamp
- "Read my list" → All active tasks
- "What's next?" → Next undone task

## Architecture
```
Voice Input → Layercode SDK → GPT-4o-mini → File Operations → TTS Response
```

## Key Classes
- **TodoFileManager**: File I/O operations for ~/todo.txt
- **VoiceManager**: Layercode integration and audio processing
- **AIProcessor**: OpenAI GPT-4o-mini for command interpretation

## Development Progress

### ✅ COMPLETED - Full Voice Integration Working (Aug 13, 2025)
- [x] Electron application with complete voice processing
- [x] Layercode frontend SDK integration with vanilla JS
- [x] Vercel serverless backend with proper SSE implementation
- [x] OpenAI GPT-4o-mini integration for command processing
- [x] End-to-end voice flow: Speech → AI → TTS response
- [x] Core voice commands working ("What needs my attention?", "Add task", "Mark done")
- [x] Real-time voice transcription and AI responses
- [x] Proper error handling and connection management

**Status**: ✅ **FULLY FUNCTIONAL** - Voice todo assistant working end-to-end

## API Requirements
- **OpenAI API Key**: For GPT-4o-mini intent recognition and responses
- **Layercode API Key + Project ID**: For voice processing pipeline

## File Locations
- **Todo File**: `~/todo.txt` (configurable)
- **Backups**: `~/.jarvis-backups/todo-backup-TIMESTAMP.txt`
- **Config**: `.env` file with API keys

## Success Metrics
- Response time: <2 seconds from voice to action
- Speech recognition: >90% accuracy
- User behavior: Stops manually opening todo.txt file
- Reliability: No data loss with automatic backups

## Implementation Log

**Final Working Architecture** (Aug 13, 2025):
- **Frontend**: Electron app with Layercode JS SDK (vanilla JS, not React)
- **Backend**: Vercel serverless functions with SSE implementation
- **Voice Flow**: Voice → Layercode SDK → Vercel webhook → OpenAI GPT-4o-mini → SSE Response → TTS
- **Pipeline ID**: `l7l2bv2c`
- **Webhook**: `https://jarvis-vert-eta.vercel.app/api/webhook-simple`
- **Authorization**: `https://jarvis-vert-eta.vercel.app/api/authorize`

**Key Technical Solutions That Worked**:
- ✅ **Layercode Vanilla JS SDK** - Frontend uses CDN import with `authorizeSessionEndpoint` pattern
- ✅ **Vercel serverless functions** - Proper Node.js `req/res` format, not Web API
- ✅ **Manual SSE implementation** - Custom SSE formatting compatible with Layercode expectations
- ✅ **Pipeline-based authorization** - Let Layercode SDK handle auth flow automatically
- ✅ **In-memory todo storage** - Simple but functional for demo purposes

**SSE Response Format** (working):
```
Content-Type: text/event-stream
data: {"type":"response.tts","content":"response text","turn_id":"id"}

data: {"type":"response.end","turn_id":"id"}
```

**Voice Commands Working**:
- "What needs my attention?" → Reads priority tasks
- "Add [task name]" → Adds new task  
- "Mark [task] done" → Completes task with fuzzy matching
- All responses via natural TTS through Layercode/Cartesia

**Major Development Challenges Solved** (Aug 13, 2025):
1. **50+ hours of failed attempts** → Finally working with correct SDK usage patterns
2. **Layercode Node.js SDK failures in Vercel** → Switched to frontend SDK with backend webhooks
3. **Mixed Next.js vs Vercel function patterns** → Used pure Vercel serverless functions  
4. **Authorization flow confusion** → Used `authorizeSessionEndpoint` pattern from working lickedin project
5. **CORS and request format issues** → Proper headers and Node.js `req/res` objects
6. **ES module vs CommonJS conflicts** → Consistent ES module usage

**Final Working File Structure**:
```
/api/webhook-simple.js  - Working SSE webhook handler
/api/authorize.js       - Layercode session authorization
/main.js               - Electron main process
/renderer/renderer.js  - Frontend with Layercode JS SDK
```

**Final Result**: ✅ **FULLY FUNCTIONAL** voice-controlled todo assistant with:
- Real-time speech-to-text via Layercode
- Natural language processing via OpenAI GPT-4o-mini  
- Text-to-speech responses via Layercode/Cartesia
- Complete end-to-end voice conversation flow
- Reliable cloud deployment on Vercel