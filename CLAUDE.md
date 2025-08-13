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

### ✅ Phase 1: Project Setup & Core Infrastructure (COMPLETED)
- [x] Electron application with package.json and dependencies
- [x] Basic main/renderer process architecture with secure IPC
- [x] Project directory structure (src/, renderer/, etc.)
- [x] TodoFileManager class with full CRUD operations
- [x] Environment configuration for API keys (.env, .gitignore)
- [x] File operations tested successfully with sample data
- [x] UI foundation with microphone button and todo display

**Status**: All core file operations working. App ready to run with `npm start`.

### 🔄 Phase 2: Voice Processing Integration (NEXT)
- [ ] Integrate Layercode Node.js SDK for speech-to-text
- [ ] Set up OpenAI GPT-4o-mini integration with function calling
- [ ] Implement AIProcessor class with command recognition
- [ ] Create VoiceManager class for audio capture
- [ ] Add text-to-speech capabilities using native APIs

### 📋 Phase 3: Core Voice Commands (PLANNED)
- [ ] "What needs my attention?" command implementation
- [ ] "Add [task]" functionality with natural language parsing
- [ ] "Mark [task] done" command with fuzzy matching
- [ ] "Read my list" and "What's next?" commands
- [ ] Voice confirmation responses for all actions

### 🎨 Phase 4: UI & User Experience (PLANNED)
- [ ] Enhanced Electron GUI with visual feedback
- [ ] Listening/processing state indicators
- [ ] Error handling and fallback modes
- [ ] First-run setup for todo.txt file location
- [ ] Comprehensive backup system validation

### 🧪 Phase 5: Testing & Polish (PLANNED)
- [ ] Real todo.txt file testing with various voice commands
- [ ] Response time optimization (<2 second requirement)
- [ ] Wake word detection via Layercode
- [ ] Comprehensive error handling implementation
- [ ] Performance testing and reliability validation

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

## Current Status
✅ **FULLY WORKING VOICE ASSISTANT** - Completed implementation with Vercel deployment.

## Implementation Log

### 2025-08-13 00:00 - Complete Voice Assistant Working
**Status**: ✅ JARVIS Voice Assistant fully operational

**Final Architecture**:
- **Frontend**: Electron app with Layercode voice capture (pipeline `l7l2bv2c`)
- **Backend**: Vercel serverless functions with manual SSE implementation
- **Voice Flow**: Voice → Layercode → Webhook → OpenAI GPT-4o-mini → SSE Response → TTS
- **Webhook**: `https://jarvis-vert-eta.vercel.app/api/webhook`

**Key Technical Decisions**:
- ❌ **Abandoned @layercode/node-server-sdk** - SDK import consistently failed in Vercel
- ✅ **Manual Server-Sent Events implementation** - Works reliably with Layercode TTS
- ✅ **Vercel deployment with ngrok replacement** - Permanent webhook URL
- ✅ **In-memory todo storage** - Simple demo implementation vs file-based

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

**Development Challenges Solved**:
1. **ngrok instability** → Vercel permanent URLs
2. **Layercode SDK failures** → Manual SSE implementation  
3. **ES module import issues** → Removed SDK dependency entirely
4. **TTS not working** → Correct SSE event format discovery
5. **Webhook 502 errors** → Proper Vercel function configuration

**Final File Structure**:
```
/api/webhook.js     - Main SSE webhook handler
/api/authorize.js   - Layercode auth endpoint  
/main.js           - Electron app (for future desktop integration)
/renderer/         - Electron UI (for future desktop integration)
```

**Result**: Fully functional voice-controlled todo assistant with natural language processing, reliable cloud deployment, and working text-to-speech responses.