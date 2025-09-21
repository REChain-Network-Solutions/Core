const mockWeb6Agent = require('./test/mocks/mock_web6_agent');

class Web6Helper {
  constructor() {
    this.agent = null;
  }

  async init() {
    if (process.env.USE_MOCK_WEB6 === 'true') {
      this.agent = mockWeb6Agent;
    } else {
      // Placeholder for real Web6 agent initialization
      // This could involve connecting to decentralized AI agents or quantum-safe key services
      this.agent = mockWeb6Agent; // fallback to mock for now
    }
  }

  async quantumResistantKeyGen() {
    if (!this.agent) {
      throw new Error('Web6 agent not initialized');
    }
    return this.agent.quantumResistantKeyGen();
  }

  async autonomousAgentDecision(data) {
    if (!this.agent) {
      throw new Error('Web6 agent not initialized');
    }
    return this.agent.autonomousAgentDecision(data);
  }

  async interoperabilityLayer(data) {
    if (!this.agent) {
      throw new Error('Web6 agent not initialized');
    }
    return this.agent.interoperabilityLayer(data);
  }
}

module.exports = Web6Helper;
