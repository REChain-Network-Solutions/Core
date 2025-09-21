const assert = require('assert');
const sinon = require('sinon');
const Web3Helper = require('../web3_helper');
const Web4Integration = require('../web4_integration');
const Web5Helper = require('../web5_helper');
const Web6Helper = require('../web6_helper');

describe('Integration Tests for Helpers', function() {
  this.timeout(10000);

  describe('Web3Helper', function() {
    it('should get balance from mock provider', async function() {
      const web3 = new Web3Helper('mock');
      const balance = await web3.getBalance('0x123');
      assert.strictEqual(balance, '1000000000000000000');
    });

    it('should subscribe to event and receive data', function(done) {
      const web3 = new Web3Helper('mock');
      web3.subscribeToEvent('0xcontract', [], 'TestEvent', (err, event) => {
        assert.ifError(err);
        assert.strictEqual(event.event, 'TestEvent');
        done();
      });
    });
  });

  describe('Web4Integration', function() {
    let web4;

    beforeEach(() => {
      web4 = new Web4Integration('mock');
    });

    it('should analyze market trends with mock response', async function() {
      const result = await web4.analyzeMarketTrends('test prompt');
      assert.ok(result.includes('Mocked AI response'));
    });

    it('should generate image from description with mock response', async function() {
      const url = await web4.generateImageFromDescription('test description');
      assert.strictEqual(url, 'http://mocked.image.url/generated.png');
    });
  });

  describe('Web5Helper', function() {
    let web5;

    before(async () => {
      process.env.USE_MOCK_WEB5 = 'true';
      web5 = await Web5Helper.init();
    });

    it('should create a DID', async function() {
      const did = await web5.createDID();
      assert.strictEqual(did, 'did:example:mocked');
    });

    it('should create a verifiable credential', async function() {
      const vc = await web5.createVC({ name: 'Test' });
      assert.strictEqual(vc.issuer, 'did:example:mocked');
      assert.strictEqual(vc.credentialSubject.name, 'Test');
    });

    it('should store and query data', async function() {
      const id = await web5.storeData({ foo: 'bar' }, 'test-protocol');
      assert.ok(id);
      const results = await web5.queryData('test-protocol');
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0);
    });
  });

  describe('Web6Helper', function() {
    let web6;

    before(async () => {
      process.env.USE_MOCK_WEB6 = 'true';
      web6 = new Web6Helper();
      await web6.init();
    });

    it('should generate quantum resistant key', async function() {
      const key = await web6.quantumResistantKeyGen();
      assert.strictEqual(key, 'mockedQuantumResistantKey1234567890abcdef');
    });

    it('should make autonomous agent decision', async function() {
      const decision = await web6.autonomousAgentDecision({ value: 2000 });
      assert.strictEqual(decision, 'Approve transaction');
    });

    it('should provide interoperability data', async function() {
      const data = await web6.interoperabilityLayer({ web3: 'data1', web4: 'data2', web5: 'data3' });
      assert.strictEqual(data.web3Data, 'data1');
      assert.strictEqual(data.web4Data, 'data2');
      assert.strictEqual(data.web5Data, 'data3');
      assert.ok(data.timestamp);
    });
  });
});
