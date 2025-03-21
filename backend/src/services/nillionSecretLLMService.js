// backend/src/services/nillionSecretLLMService.js
require('dotenv').config();
const fetch = require('node-fetch');

module.exports = {
  /**
   * Run a chat-based LLM request in the TEE environment.
   *
   * @param {Array} messages - Array of chat messages [{ role: "system"|"user"|"assistant", content: string }]
   * @param {Object} [options] - Additional LLM options like model, temperature, etc.
   * @returns {Promise<Object>} - The LLM response data
   */
  async runLLMChat(messages, options = {}) {
    try {
      // Use environment variables defined in your .env file.
      // The documentation uses NILAI_API_URL and NILAI_API_KEY.
      const apiUrl = process.env.NILAI_API_URL;
      const apiKey = process.env.NILAI_API_KEY;

      if (!apiUrl || !apiKey) {
        throw new Error('Missing NILAI_API_URL or NILAI_API_KEY in env');
      }

      // Set default values for options if not provided
      const {
        model = 'meta-llama/Llama-3.1-8B-Instruct',
        temperature = 0.2,
      } = options;

      // Construct payload for the SecretLLM endpoint.
      // This endpoint is required to interface with the TEE-protected AI service.
      const payload = {
        model,
        messages, // e.g. [{ role: "system", content: "You are an agent..." }, { role: "user", content: "Hello" }]
        temperature,
      };

      // Send a POST request to the TEE environment endpoint.
      // The endpoint (e.g. /v1/chat/completions) is needed because the service is hosted externally.
      const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SecretLLM error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[nillionSecretLLMService] runLLMChat error:', error);
      throw error;
    }
  },

  /**
   * Analyze a claim using a simplified text-based LLM call.
   *
   * @param {string} claim - A piece of text or claim to analyze
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeClaim(claim) {
    try {
      console.log('[nillionSecretLLMService] Analyzing claim in TEE...');
      const messages = [
        {
          role: 'system',
          content:
            'You are an AI agent that verifies the truthfulness or validity of claims. Provide reasoning.',
        },
        {
          role: 'user',
          content: claim,
        },
      ];

      // Reuse the chat method from above
      const llmResponse = await this.runLLMChat(messages, {
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        temperature: 0.0,
      });

      // Suppose the final text is in llmResponse.choices[0].message.content
      const llmText = llmResponse?.choices?.[0]?.message?.content || '';

      return {
        status: 'verified',
        reasoning: llmText,
      };
    } catch (error) {
      console.error('[nillionSecretLLMService] analyzeClaim error:', error);
      return {
        status: 'unknown',
        reasoning: 'Failed to analyze due to TEE error',
      };
    }
  },
};
