const OpenAI = require('openai').default;

class IntentParser {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async parseIntent(voiceText, currentTasks = []) {
    try {
      const systemPrompt = `You are an intent parser for a voice todo assistant. Parse the user's voice command and return ONLY a JSON object with the function to call and its parameters.

Available functions:
- add_task: Add new task. Params: {task: string, priority?: "urgent"|"normal"|"low", deadline?: "today"|"tomorrow"|date}
- mark_complete: Mark task done. Params: {taskQuery: string}
- update_task: Edit task text. Params: {taskQuery: string, newText: string}
- delete_task: Remove task. Params: {taskQuery: string}
- add_deadline: Set due date. Params: {taskQuery: string, deadline: string}
- set_priority: Change priority. Params: {taskQuery: string, priority: "urgent"|"normal"|"low"}
- list_tasks: Read tasks. Params: {filter?: "urgent"|"today"|"all"}
- search_tasks: Find tasks. Params: {query: string}

Current tasks: ${currentTasks.join(', ') || 'None'}

Examples:
"Add call John about the meeting" → {"function": "add_task", "params": {"task": "call John about the meeting"}}
"Mark dentist done" → {"function": "mark_complete", "params": {"taskQuery": "dentist"}}
"What needs my attention" → {"function": "list_tasks", "params": {"filter": "urgent"}}
"Make grocery shopping urgent" → {"function": "set_priority", "params": {"taskQuery": "grocery shopping", "priority": "urgent"}}
"Change call John to call John at 3pm" → {"function": "update_task", "params": {"taskQuery": "call John", "newText": "call John at 3pm"}}

IMPORTANT: Return ONLY valid JSON. No explanation or extra text.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: voiceText }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        const intent = JSON.parse(response);
        console.log('🧠 Parsed intent:', JSON.stringify(intent, null, 2));
        return intent;
      } catch (parseError) {
        console.error('❌ Failed to parse intent JSON:', response);
        return {
          function: "error",
          params: { message: "Could not understand your request. Please try again." }
        };
      }

    } catch (error) {
      console.error('❌ Intent parsing error:', error);
      return {
        function: "error",
        params: { message: "Sorry, I had trouble processing your request." }
      };
    }
  }
}

module.exports = IntentParser;