/**
 * LM Studio AI Integration System
 * Connects VessieOS kernel with LM Studio for AI inference
 */

class LMStudioIntegration {
  constructor(config = {}) {
    this.host = config.host || 'http://localhost:1234';
    this.apiPath = '/v1';
    this.models = [];
    this.currentModel = null;
    this.isConnected = false;
    this.messageHistory = [];
    this.maxHistorySize = config.maxHistorySize || 50;
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2048;
    this.init();
  }

  async init() {
    console.log('[LMStudio] Initializing AI integration...');
    await this.checkConnection();
    await this.loadModels();
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.host}${this.apiPath}/models`);
      if (response.ok) {
        this.isConnected = true;
        console.log('[LMStudio] Connected to LM Studio');
        return true;
      }
    } catch (error) {
      console.warn('[LMStudio] Cannot connect to LM Studio:', error.message);
      this.isConnected = false;
    }
    return false;
  }

  async loadModels() {
    if (!this.isConnected) return [];

    try {
      const response = await fetch(`${this.host}${this.apiPath}/models`);
      const data = await response.json();
      this.models = data.data || [];
      
      if (this.models.length > 0) {
        this.currentModel = this.models[0].id;
        console.log(`[LMStudio] Loaded ${this.models.length} models. Current: ${this.currentModel}`);
      }
      
      return this.models;
    } catch (error) {
      console.error('[LMStudio] Error loading models:', error);
      return [];
    }
  }

  async chat(message, options = {}) {
    if (!this.isConnected || !this.currentModel) {
      return { error: 'LM Studio not connected' };
    }

    this.messageHistory.push({
      role: 'user',
      content: message
    });

    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    const payload = {
      model: this.currentModel,
      messages: this.messageHistory,
      temperature: options.temperature || this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: false
    };

    try {
      const response = await fetch(`${this.host}${this.apiPath}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      this.messageHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      return {
        success: true,
        message: assistantMessage,
        model: this.currentModel
      };
    } catch (error) {
      console.error('[LMStudio] Chat error:', error);
      return { error: error.message };
    }
  }

  async generate(prompt, options = {}) {
    if (!this.isConnected || !this.currentModel) {
      return { error: 'LM Studio not connected' };
    }

    const payload = {
      model: this.currentModel,
      prompt: prompt,
      temperature: options.temperature || this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: false
    };

    try {
      const response = await fetch(`${this.host}${this.apiPath}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        text: data.choices[0].text,
        model: this.currentModel
      };
    } catch (error) {
      console.error('[LMStudio] Generate error:', error);
      return { error: error.message };
    }
  }

  async streamChat(message, onChunk) {
    if (!this.isConnected || !this.currentModel) {
      return { error: 'LM Studio not connected' };
    }

    this.messageHistory.push({
      role: 'user',
      content: message
    });

    const payload = {
      model: this.currentModel,
      messages: this.messageHistory,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true
    };

    try {
      const response = await fetch(`${this.host}${this.apiPath}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0].delta.content || '';
              fullMessage += content;
              onChunk(content);
            } catch (e) {
              // Skip parsing errors
            }
          }
        }
      }

      this.messageHistory.push({
        role: 'assistant',
        content: fullMessage
      });

      return { success: true, message: fullMessage };
    } catch (error) {
      console.error('[LMStudio] Stream error:', error);
      return { error: error.message };
    }
  }

  clearHistory() {
    this.messageHistory = [];
  }

  setModel(modelId) {
    if (this.models.find(m => m.id === modelId)) {
      this.currentModel = modelId;
      this.clearHistory();
      return true;
    }
    return false;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      currentModel: this.currentModel,
      availableModels: this.models.map(m => m.id),
      messageCount: this.messageHistory.length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LMStudioIntegration;
}
