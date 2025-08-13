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
- [x] **Electron + Next.js Hybrid**: Desktop app serving static Next.js build
- [x] **Voice Pipeline Working**: End-to-end voice flow with Layercode → OpenAI → TTS
- [x] **Amplitude Visualization**: Real-time audio feedback bars working properly
- [x] **Build Process Optimized**: Proper .gitignore, build artifacts excluded from source control
- [x] **Development Workflow**: Clean `npm run dev` command for rapid testing

**Current Status**: ✅ **VOICE INTERACTION WORKING** - React-based frontend with full voice conversation capability

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

## 🎯 NEXT DEVELOPMENT PHASE - TODO.TXT FILE INTEGRATION

### Priority 1: Core File Operations (Must Have)
1. **Create TodoFileManager Class** - Handle all file I/O operations for ~/todo.txt
   - Read existing todo.txt file or create if doesn't exist
   - Parse tasks (active vs [DONE] completed tasks)
   - Write changes back to file with proper formatting
   - Error handling for file permissions/locks

2. **Implement File Backup System** - Automatic versioned backups before changes
   - Create ~/.jarvis-backups/ directory
   - Generate timestamped backup files before modifications
   - Limit backup retention (keep last 10 backups)

3. **Update Vercel Webhook Integration** - Connect voice commands to file operations
   - Modify /api/webhook-simple.js to call file operations
   - Handle "Add task" → append to todo.txt file
   - Handle "Mark done" → move task to [DONE] section with timestamp
   - Handle "What needs attention" → read and prioritize actual file contents

### Priority 2: Essential Voice Commands (Must Have)
4. **"Add [task]" Command** - Append new tasks to todo.txt
   - Parse task from voice transcript
   - Add to active tasks section (before [DONE] tasks)
   - Confirm addition via TTS response

5. **"Mark [task] done" Command** - Complete tasks with timestamp
   - Fuzzy matching to find task in active list
   - Move to [DONE] section with current date
   - Handle ambiguous matches (ask for clarification)

6. **"What needs my attention?" Command** - Read top priority tasks
   - Parse active tasks from file
   - Apply prioritization logic (urgency keywords, due dates)
   - Read top 3-5 tasks via TTS

7. **"Read my list" Command** - Read all active tasks
   - Skip [DONE] tasks
   - Read all undone tasks with natural speech pacing

8. **"What's next?" Command** - Read next undone task
   - Return first active task or smart priority selection
   - Handle empty list gracefully

### Priority 3: File Format & Parsing (Must Have)
9. **Implement Simple File Format Parser**
   ```
   Active tasks (one per line)
   Another active task
   
   [DONE] 2025-08-13 Completed task
   [DONE] 2025-08-13 Another completed task
   ```

10. **Handle File Creation** - Create ~/todo.txt if doesn't exist
    - Check file existence on startup
    - Create with helpful initial content
    - Set proper file permissions

### Priority 4: Error Handling & Reliability (Must Have)
11. **File Lock Handling** - Handle concurrent access safely
    - Detect if file is locked/in use
    - Retry mechanism with exponential backoff
    - Graceful error messages via TTS

12. **Invalid File Content Handling** - Graceful degradation
    - Handle malformed todo.txt files
    - Skip unparseable lines
    - Preserve user data even with formatting issues

### Priority 5: User Experience Polish (Nice to Have)
13. **Smart Task Prioritization** - Intelligent "what needs attention" ranking
    - Detect urgency keywords (urgent, today, ASAP)
    - Prioritize newer tasks
    - Consider task length/complexity

14. **Natural Language Confirmation** - Better voice feedback
    - "I added 'call dentist' to your list"
    - "I marked 'buy groceries' as complete"
    - "You have 5 tasks remaining"

15. **File Location Configuration** - Allow custom todo.txt location
    - Support environment variable override
    - Validate file path accessibility

## Development Approach
1. **Build incrementally** - Start with basic file read/write, add commands one by one
2. **Test with real todo.txt files** - Use actual existing user files for testing
3. **Maintain voice-first UX** - All functionality accessible via voice only
4. **Keep simple file format** - Stick to plain text, human-readable format
5. **Ensure data safety** - Never lose user tasks, always backup before changes

**Goal**: Transform current voice-only demo into fully functional todo.txt file manager that replaces manual file editing entirely.