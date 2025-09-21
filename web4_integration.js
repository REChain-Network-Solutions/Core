const mockOpenAIAPI = require('./test/mocks/mock_openai_api');

class Web4Integration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.cache = new Map();
  }

  async analyzeMarketTrends(prompt) {
    if (this.cache.has(prompt)) {
      return this.cache.get(prompt);
    }
    try {
      let response;
      if (this.apiKey === 'mock') {
        response = await mockOpenAIAPI.chatCompletions({
          model: 'gpt-4-turbo',
          messages: [{
            role: 'user',
            content: `As a real estate market analyst: ${prompt}`
          }],
          max_tokens: 500
        });
      } else {
        const axios = require('axios');
        response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: 'gpt-4-turbo',
            messages: [{
              role: 'user',
              content: `As a real estate market analyst: ${prompt}`
            }],
            max_tokens: 500
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      const result = response.data.choices[0].message.content;
      this.cache.set(prompt, result);
      return result;
    } catch (error) {
      throw new Error(`AI analysis failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generatePropertyDescription(propertyData) {
    const prompt = `Generate compelling real estate listing description for:\n${JSON.stringify(propertyData, null, 2)}`;
    return this.analyzeMarketTrends(prompt);
  }

  async predictMarketValue(propertyData) {
    const prompt = `Estimate market value for property with features:\n${JSON.stringify(propertyData, null, 2)}`;
    return this.analyzeMarketTrends(prompt);
  }

  async generateImageFromDescription(description) {
    try {
      let response;
      if (this.apiKey === 'mock') {
        response = await mockOpenAIAPI.imageGenerations({
          prompt: description,
          n: 1,
          size: '1024x1024'
        });
      } else {
        const axios = require('axios');
        response = await axios.post(
          `${this.baseUrl}/images/generations`,
          {
            prompt: description,
            n: 1,
            size: '1024x1024'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      return response.data.data[0].url;
    } catch (error) {
      throw new Error(`Image generation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = Web4Integration;
