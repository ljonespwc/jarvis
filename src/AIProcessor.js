class AIProcessor {
  constructor() {
    this.openaiClient = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('AIProcessor initializing...');
      
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not found in environment variables');
        console.log('Note: OpenAI integration will be enabled once API key is configured');
      } else {
        const { OpenAI } = require('openai');
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('OpenAI client initialized successfully');
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AIProcessor:', error);
      throw error;
    }
  }

  async processCommand(speechText, currentTodos) {
    try {
      console.log(`Processing command: "${speechText}"`);
      
      if (!this.openaiClient) {
        return this.processCommandFallback(speechText, currentTodos);
      }

      const systemPrompt = `You are JARVIS, a voice assistant for todo.txt files. 
Current todos: ${JSON.stringify(currentTodos, null, 2)}

Extract the action from the user's speech and respond with a function call.
Be natural and conversational in your responses.`;

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
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
                task: { type: "string", description: "The task to add" },
                priority: { type: "string", enum: ["high", "normal", "low"], default: "normal" }
              },
              required: ["task"]
            }
          },
          {
            name: "mark_done",
            description: "Mark a task as completed",
            parameters: {
              type: "object",
              properties: {
                task_match: { type: "string", description: "Text to match against existing tasks" }
              },
              required: ["task_match"]
            }
          },
          {
            name: "read_tasks",
            description: "Read priority tasks aloud",
            parameters: {
              type: "object",
              properties: {
                limit: { type: "number", default: 5 },
                filter: { type: "string", enum: ["all", "priority", "recent"], default: "priority" }
              }
            }
          }
        ],
        function_call: "auto"
      });

      const choice = response.choices[0];
      
      if (choice.function_call) {
        return {
          action: choice.function_call.name,
          parameters: JSON.parse(choice.function_call.arguments),
          response: choice.message.content || this.generateDefaultResponse(choice.function_call.name)
        };
      } else {
        return {
          action: 'unknown',
          response: choice.message.content || "I'm not sure what you want me to do. Can you be more specific?"
        };
      }

    } catch (error) {
      console.error('Error processing command with OpenAI:', error);
      return this.processCommandFallback(speechText, currentTodos);
    }
  }

  processCommandFallback(speechText, currentTodos) {
    const text = speechText.toLowerCase();
    
    console.log('Using fallback command processing');

    if (text.includes('what needs') || text.includes('attention') || text.includes('priority')) {
      return {
        action: 'read_tasks',
        parameters: { limit: 5, filter: 'priority' },
        response: "Here are your top priority tasks:"
      };
    }
    
    if (text.includes('add ') || text.includes('create ') || text.includes('new task')) {
      const taskMatch = text.match(/(?:add|create|new task)\s+(.+)/);
      if (taskMatch) {
        return {
          action: 'add_task',
          parameters: { task: taskMatch[1].trim(), priority: 'normal' },
          response: `I've added "${taskMatch[1].trim()}" to your list.`
        };
      }
    }
    
    if (text.includes('done') || text.includes('complete') || text.includes('finished')) {
      const taskMatch = text.match(/(?:done|complete|finished)\s+(.+)/);
      if (taskMatch) {
        return {
          action: 'mark_done',
          parameters: { task_match: taskMatch[1].trim() },
          response: `I've marked "${taskMatch[1].trim()}" as completed.`
        };
      }
    }
    
    if (text.includes('read') || text.includes('list') || text.includes('show')) {
      return {
        action: 'read_tasks',
        parameters: { limit: 10, filter: 'all' },
        response: "Here are all your tasks:"
      };
    }

    return {
      action: 'unknown',
      response: "I didn't understand that command. Try saying 'What needs my attention?' or 'Add [task name]'."
    };
  }

  generateDefaultResponse(actionName) {
    const responses = {
      'add_task': "I've added that task to your list.",
      'mark_done': "Great! I've marked that task as completed.",
      'read_tasks': "Here are your tasks:"
    };
    
    return responses[actionName] || "Task processed successfully.";
  }

  async generateResponse(action, result, context = {}) {
    try {
      if (!this.openaiClient) {
        return this.generateResponseFallback(action, result);
      }

      const prompt = `Generate a natural, conversational response for this todo action:
Action: ${action}
Result: ${JSON.stringify(result)}
Context: ${JSON.stringify(context)}

Keep the response brief and friendly, as if JARVIS is speaking to the user.`;

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are JARVIS, a helpful voice assistant. Generate brief, natural responses."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating response with OpenAI:', error);
      return this.generateResponseFallback(action, result);
    }
  }

  generateResponseFallback(action, result) {
    const responses = {
      'add_task': "Task added successfully.",
      'mark_done': "Task marked as completed.",
      'read_tasks': "Here are your tasks.",
      'error': "I encountered an error processing that request."
    };

    return responses[action] || "Request processed.";
  }
}

module.exports = AIProcessor;