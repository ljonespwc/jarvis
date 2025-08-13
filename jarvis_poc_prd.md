# JARVIS Voice Todo - Proof of Concept PRD

## Problem Statement
Todo.txt users have to manually re-read their files multiple times per day to maintain "ambient awareness" of what needs attention. This is tedious and causes tasks to fall through the cracks.

## Solution
A simple desktop app that provides voice interaction with a single todo.txt file, solving the ambient awareness problem.

## Core User Story
"Hey JARVIS, what needs my attention?" → Instant spoken summary of important tasks.

## MVP Scope: Desktop-Only Proof of Concept

### Target Platform
- **Cross-platform desktop app** (Electron - works on macOS, Windows, Linux)
- **Single todo.txt file** in user's home directory
- **Voice-first interface** with minimal GUI

### Core Features (Must Have)

#### 1. Voice Input
- Wake word: "Hey JARVIS" or manual activation via Layercode
- Real-time speech recognition using Layercode Node.js SDK
- Intent recognition and natural language processing via Layercode
- Commands processed with Layercode's voice AI pipeline

#### 2. Essential Voice Commands
```
"What needs my attention?" → Read top 3-5 tasks
"Add [task]" → Append to file with timestamp
"Mark [task] done" → Move to done section or delete
"What's next?" → Read next undone task
"Read my list" → Read all undone tasks
```

#### 3. File Management
- Works with existing `~/todo.txt` file
- Creates file if it doesn't exist
- Simple format: one task per line
- Completed tasks moved to bottom with [DONE] prefix
- Auto-backup before any changes

#### 4. Voice Output
- Text-to-speech for all responses
- Confirm actions: "Added: Call dentist"
- Natural speech for task reading

### Technical Implementation

#### Tech Stack
- **Electron + Node.js** (cross-platform desktop app)
- **Layercode Node.js SDK** for voice-to-text conversion
- **OpenAI GPT-4.1-mini** for natural language processing and task understanding
- **File I/O** for todo.txt manipulation
- **Native speech synthesis** for responses

#### Architecture
```
Voice Input → Layercode SDK → GPT-4.1-mini Processing → File Operations → Voice Response
```

#### Layercode Integration
- **Node.js SDK**: Real-time voice processing
- **REST API**: Fallback for complex queries
- **Webhook/SSE**: Real-time voice streaming
- **React SDK**: Future web interface components

#### File Format (Dead Simple)
```
# todo.txt
Call dentist
Buy groceries  
Finish quarterly report
Review contracts

[DONE] 2025-08-12 Called mom
[DONE] 2025-08-12 Paid bills
```

### Success Metrics
- **Speed**: Voice command to response in <2 seconds
- **Accuracy**: >90% speech recognition accuracy
- **Usability**: User stops manually opening todo.txt file
- **Reliability**: No data loss, proper file backups

### Out of Scope (For Now)
- Mobile apps
- Multiple files (inbox/backlog)
- Calendar integration
- Complex scheduling
- Sync between devices
- Web interface
- Complex project management
- Recurring tasks

### Development Phases

#### Phase 1: Layercode Integration & Core Loop (Week 1)
- Setup Electron app with Node.js backend
- Integrate Layercode Node.js SDK
- Implement basic voice command: "What needs my attention?"
- Read from existing todo.txt file
- Text-to-speech response using native APIs

#### Phase 2: Task Management via Voice (Week 2)
- "Add [task]" command via Layercode intent recognition
- "Mark [task] done" command with fuzzy matching
- File backup system with versioning
- Error handling for voice recognition failures

#### Phase 3: Polish & Reliability (Week 3)
- Wake word detection via Layercode
- Improved natural language processing
- Edge case handling (file locked, unclear speech)
- User testing with real todo.txt files

## Technical Requirements

### Layercode Setup Requirements
- Layercode API account and credentials
- Node.js SDK installation: `npm install @layercode/node-sdk`
- Webhook endpoint configuration (for real-time responses)
- Audio input permissions in Electron app

### Key Classes/Components

#### 1. VoiceManager (Node.js)
```javascript
const layercode = require('@layercode/node-sdk');

class VoiceManager {
    async startListening() {
        // Initialize Layercode voice stream
    }
    
    async processVoiceCommand(audioStream) {
        // Send to Layercode for processing
        // Get intent and parameters back
    }
    
    async speak(text) {
        // Text-to-speech response
    }
}
```

#### 2. TodoFileManager (Node.js)
```javascript
const fs = require('fs').promises;

class TodoFileManager {
    async readTasks() {
        // Read and parse todo.txt
    }
    
    async addTask(taskText) {
        // Append task with timestamp
    }
    
    async markDone(taskIndex) {
        // Move task to done section
    }
    
    async backup() {
        // Create versioned backup
    }
}
```

#### 3. AIProcessor (Node.js)
```javascript
const OpenAI = require('openai');

class AIProcessor {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    
    async processCommand(speechText, currentTodos) {
        // Send to GPT-4.1-mini with current todo context
        // Get structured function call back
    }
    
    async generateResponse(action, result) {
        // Use GPT-4.1-mini to generate natural confirmation
    }
}
```

### Layercode + GPT-4.1-mini Integration

#### Voice Processing Pipeline
1. **Voice Capture**: Layercode captures and converts speech to text
2. **Context Preparation**: Add current todo.txt contents as context
3. **GPT-4.1-mini Processing**: Understand intent and extract structured actions
4. **Action Execution**: Execute file operations based on GPT understanding
5. **Response Generation**: GPT-4.1-mini generates natural response, TTS speaks it

#### API Usage Patterns
```javascript
// Layercode for speech-to-text
const speechText = await layercode.speechToText(audioStream);

// GPT-4.1-mini for understanding and action extraction
const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
        {
            role: "system", 
            content: `You are JARVIS, a voice assistant for todo.txt files. 
                     Current todos: ${currentTodos}
                     Extract the action and respond naturally.`
        },
        {
            role: "user",
            content: speechText
        }
    ],
    functions: [
        {
            name: "add_task",
            description: "Add a new task to the todo list",
            parameters: {
                type: "object",
                properties: {
                    task: { type: "string" },
                    priority: { type: "string", enum: ["high", "normal", "low"] }
                }
            }
        },
        {
            name: "mark_done", 
            description: "Mark a task as completed",
            parameters: {
                type: "object",
                properties: {
                    task_match: { type: "string" }
                }
            }
        },
        {
            name: "read_tasks",
            description: "Read priority tasks aloud", 
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number" },
                    filter: { type: "string" }
                }
            }
        }
    ]
});

// Execute the function GPT-4.1-mini identified
if (response.choices[0].function_call) {
    await executeFunction(response.choices[0].function_call);
}
```

### Command Recognition via GPT-4.1-mini
```javascript
// User says: "Hey JARVIS, I need to call the dentist tomorrow afternoon"
// Layercode converts to text: "I need to call the dentist tomorrow afternoon"
// GPT-4.1-mini processes and returns:
{
    function_call: {
        name: "add_task",
        arguments: {
            task: "Call dentist",
            priority: "normal", 
            timing: "tomorrow afternoon"
        }
    },
    response: "I've added 'Call dentist' to your list for tomorrow afternoon."
}

// User says: "What do I need to focus on right now?"
// GPT-4.1-mini returns:
{
    function_call: {
        name: "read_tasks", 
        arguments: {
            limit: 3,
            filter: "priority"
        }
    },
    response: "Here are your top priorities:"
}

// User says: "I finished the grocery shopping"
// GPT-4.1-mini returns:
{
    function_call: {
        name: "mark_done",
        arguments: {
            task_match: "grocery"
        }
    },
    response: "Great! I've marked grocery shopping as complete."
}
```

## User Experience Flow

### First Launch
1. App asks for todo.txt file location (defaults to ~/todo.txt)
2. Creates empty file if none exists
3. Shows brief tutorial: "Say 'Hey JARVIS, what needs my attention?'"

### Daily Usage
1. User says wake word or clicks mic button in Electron app
2. Layercode processes speech and returns structured intent
3. App executes command based on Layercode's intent recognition
4. Responds with voice confirmation via text-to-speech
5. File updated immediately with automatic backup

### Error Handling
- Speech not recognized by Layercode: "I didn't catch that, please try again"
- GPT-4.1-mini unclear on intent: "I'm not sure what you want me to do. Can you be more specific?"
- File operations fail: "Todo file is busy, trying again..."
- API unavailable: "Voice processing unavailable, switching to text mode"
- Task not found for completion: "I couldn't find a task matching that description"

## Definition of Done

### MVP is complete when:
- ✅ User can ask "what needs my attention?" and get spoken response
- ✅ User can add tasks by voice
- ✅ User can mark tasks done by voice  
- ✅ File operations are reliable with backups
- ✅ Speech recognition works consistently
- ✅ Response time under 2 seconds
- ✅ Works with existing todo.txt files

### Success Validation
- Build todo.txt file with 10-20 tasks
- Use only voice commands for 1 week
- User should rarely/never manually open todo.txt file
- No data corruption or loss during testing

## Next Steps After POC
If proof of concept succeeds:
1. Add iOS companion app
2. Implement calendar integration
3. Add natural language scheduling
4. Build web interface for settings
5. Add sync between devices

## Risk Mitigation
- **Layercode API Issues**: Implement fallback text input mode
- **Speech Recognition Accuracy**: Use Layercode's confidence scores to request clarification
- **File Corruption**: Automatic versioned backups before any file operations
- **Network Connectivity**: Cache common intents for offline processing
- **Performance**: Profile Layercode API response times and optimize accordingly

## Layercode Documentation References
- **Node.js SDK**: https://docs.layercode.com/sdk-reference/node_js_sdk
- **React SDK**: https://docs.layercode.com/sdk-reference/react_sdk (for future web interface)
- **Webhook/SSE API**: https://docs.layercode.com/api-reference/webhook_sse_api
- **REST API**: https://docs.layercode.com/api-reference/rest_api

---

This POC focuses on proving the core value: voice-powered ambient awareness of a simple todo.txt file. Once this works reliably, we can add complexity incrementally.