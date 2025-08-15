# JARVIS Voice Todo - Claude Code Project Context

## Project Overview
Voice-controlled desktop todo.txt application using Electron, Layercode SDK, and OpenAI GPT-4o-mini.

**Core Problem**: Manual re-reading of todo.txt files causes poor task awareness and missed items.
**Solution**: Voice-first interface for ambient awareness - "Hey JARVIS, what needs my attention?"

## Technical Stack
- **Frontend**: Electron + Next.js + React (cross-platform desktop)
- **Voice Processing**: Layercode React SDK (@layercode/react-sdk)
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

### ✅ COMPLETED - Modern Voice Architecture (Aug 13, 2025)
- [x] **Next.js + React Architecture**: Migrated from vanilla JS to modern React components
- [x] **Layercode React SDK Integration**: Using `useLayercodePipeline` hook for better state management
- [x] **Clean Console Output**: Suppressed Chrome DevTools protocol spam completely
- [x] **Electron + Next.js Hybrid**: Desktop app serving static Next.js build from `out/index.html`
- [x] **Voice Pipeline Working**: End-to-end voice flow with Layercode → OpenAI → TTS
- [x] **Amplitude Visualization**: Real-time audio feedback bars working properly
- [x] **Build Process Optimized**: Proper .gitignore, build artifacts excluded from source control
- [x] **Development Workflow**: Clean `npm run dev` command for rapid testing
- [x] **Dead Code Cleanup**: Removed orphaned vanilla JS renderer file

**Current Status**: ✅ **VOICE INTERACTION WORKING** - React-based frontend with full voice conversation capability using proper React SDK

### 🔄 IN PROGRESS - Missing Core Functionality
- [ ] **NO TODO.TXT FILE INTEGRATION** - Currently using in-memory mock data only
- [ ] **NO FILE I/O OPERATIONS** - Cannot read/write actual ~/todo.txt files
- [ ] **NO TASK PERSISTENCE** - Tasks don't persist between sessions
- [ ] **NO BACKUP SYSTEM** - No automatic file backups before changes

## API Requirements
- **OpenAI API Key**: For GPT-4o-mini intent recognition and responses
- **Layercode API Key + Project ID**: For voice processing pipeline

## File Locations
- **Todo File**: `~/Desktop/todo.txt` (user already has existing file)
- **Backups**: `~/.jarvis-backups/todo-backup-TIMESTAMP.txt`
- **Config**: `.env` file with API keys

## Success Metrics
- Response time: <2 seconds from voice to action
- Speech recognition: >90% accuracy
- User behavior: Stops manually opening todo.txt file
- Reliability: No data loss with automatic backups

## Implementation Log

**Final Working Architecture** (Aug 13, 2025):
- **Frontend**: Electron app with Next.js + React using `@layercode/react-sdk`
- **Backend**: Vercel serverless functions with SSE implementation
- **Voice Flow**: Voice → Layercode React SDK → Vercel webhook → OpenAI GPT-4o-mini → SSE Response → TTS
- **Pipeline ID**: `l7l2bv2c`
- **Webhook**: `https://jarvis-vert-eta.vercel.app/api/webhook-simple`
- **Authorization**: `https://jarvis-vert-eta.vercel.app/api/authorize`

**Key Technical Solutions That Worked**:
- ✅ **Layercode React SDK** - Frontend uses `useLayercodePipeline` hook with proper state management
- ✅ **Vercel serverless functions** - Proper Node.js `req/res` format, not Web API
- ✅ **Manual SSE implementation** - Custom SSE formatting compatible with Layercode expectations
- ✅ **Pipeline-based authorization** - Let Layercode SDK handle auth flow automatically
- ✅ **Real todo.txt file operations** - Full file I/O with TodoFileManager class
- ✅ **Automatic file backups** - Timestamped backups in ~/.jarvis-backups/ 
- ✅ **Bridge communication system** - Scalable Vercel bridge for local file access
- ✅ **Next.js static export** - Electron loads from `out/index.html` build output

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
/api/webhook-simple.js              - SSE webhook with bridge communication
/api/websocket.js                   - Real-time bridge for local file access
/api/authorize.js                   - Layercode session authorization
/main.js                           - Electron main process with bridge client
/src/TodoFileManager.js            - File I/O operations for ~/todo.txt
/pages/index.js                    - Next.js home page
/components/VoiceInterface.js      - Dynamic import wrapper
/components/VoiceInterfaceClient.js - React component with useLayercodePipeline
/preload.js                        - IPC for sessionId communication
/out/index.html                    - Built Next.js static export (served by Electron)
```

## 🎉 CURRENT STATUS - FUNCTIONAL VOICE TODO APP (Aug 14, 2025)

### ✅ COMPLETED - Full Todo.txt Integration (Aug 14, 2025)
- [x] **TodoFileManager Class**: Complete file I/O operations for `~/Desktop/todo.txt`
- [x] **Automatic Backup System**: Timestamped backups in `~/.jarvis-backups/` before changes
- [x] **Bridge Communication**: Scalable Vercel bridge connecting webhook to local Electron app
- [x] **Real File Operations**: Reading, writing, parsing actual todo.txt files
- [x] **Core Voice Commands Working**:
  - "What needs my attention?" → Reads priority tasks from file
  - "Add [task]" → Appends to todo.txt with confirmation
  - "Mark [task] done" → Completes tasks with fuzzy matching and date stamps
  - "Read my list" → Reads all active tasks
- [x] **Smart Prioritization**: Detects urgency keywords (urgent, today, ASAP)
- [x] **Error Handling**: Graceful fallback for missing files, permissions, network issues
- [x] **Session Synchronization**: React component sessionId properly synced with bridge

### 🏗️ ARCHITECTURE - PRODUCTION READY
```
Voice Input → Layercode Cloud → Vercel Webhook → Bridge Polling → Local Electron App → ~/todo.txt → Response → Layercode TTS
```

**Key Scalability Features**:
- ✅ **Multi-user Support**: Each user runs independent Electron app
- ✅ **No Manual Configuration**: Download and run - zero setup
- ✅ **Private File Access**: All todo.txt files stay local on user machines  
- ✅ **Real-time Communication**: Bridge handles webhook-to-local-app messaging
- ✅ **Automatic Backups**: File safety with timestamped backups
- ✅ **Cross-platform Ready**: Electron app works on Windows/Mac/Linux

### 🔄 VERIFIED WORKING (Aug 14, 2025)
**Integration Test Results**:
- ✅ Voice recognition via Layercode working
- ✅ File reading from actual `~/Desktop/todo.txt`  
- ✅ Task addition confirmed and verified in file
- ✅ Backup creation working (`~/.jarvis-backups/todo-backup-2025-08-14T00-00-15-818Z.txt`)
- ✅ Bridge communication stable (no timeout errors)
- ✅ TTS responses via Layercode working
- ✅ Session synchronization between React and Electron working

**Current Working Commands**:
- "What needs my attention?" → Lists top priority tasks
- "Add [task description]" → Adds task and confirms
- Voice commands process real file operations with backups

## 📱 **Unified Interface Implementation** (Aug 14, 2025 9:00 PM)

**Completed**: Single-tab TextEdit-style interface with persistent voice connection
- ✅ Removed tab system - unified voice + todo view
- ✅ Voice amplitude cards positioned side-by-side at top
- ✅ TextEdit-inspired white document design with SF Pro typography
- ✅ Fixed task ID display (#001, #002, #003) via TodoFileManager.getActiveTasks() update
- ✅ Clickable active/completed stats with filtering functionality
- ✅ Shortened intro message to "How can I help?"
- ✅ Persistent voice connection - no disconnection when switching views
- ✅ Real-time task updates with smooth animations

## 🚀 **Next Development Phase - Commercial Distribution** 

### **Multi-User Architecture Requirements**

**Current Limitation**: Each user requires their own Layercode pipeline/API keys for voice processing, which isn't viable for commercial distribution.

**Required Change**: Implement user-scoped sessions for shared Layercode pipeline:

**Target Architecture**:
```
Voice → Shared Layercode Pipeline → Vercel Webhook → Bridge[userID] → User's Local App
```

**Implementation Plan**:
1. **Generate Persistent User IDs** - MAC address, hardware fingerprint, or license key based
2. **Modify Bridge Routing** - Route commands by userID instead of temporary sessionID  
3. **Update Local App** - Send userID instead of sessionID in bridge polling
4. **Vercel Webhook Updates** - Store/retrieve commands using userID as key
5. **Session Management** - Handle user identification and routing at scale

**Benefits**: 
- Single business API key covers all customers
- Each user maintains local todo.txt files  
- Scalable for commercial distribution
- No user setup of API keys required

**Technical Notes**: Bridge polling architecture remains the same, only the routing key changes from ephemeral sessionID to persistent userID.

---

**Ready for Additional Features**: The core foundation is complete and stable. Further development can focus on enhanced commands, UI improvements, and the multi-user distribution architecture above.