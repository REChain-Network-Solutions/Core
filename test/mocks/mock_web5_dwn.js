class MockDWNRecords {
  constructor() {
    this.records = [];
  }

  async create({ data, message }) {
    const record = {
      id: 'mockedRecordId',
      data,
      message
    };
    this.records.push(record);
    return { record };
  }

  async query({ message }) {
    // Return all records matching protocol filter
    const protocol = message.filter.protocol;
    return this.records.filter(r => r.message.protocol === protocol);
  }
}

class MockWeb5 {
  constructor() {
    this.dwn = {
      records: new MockDWNRecords()
    };
  }

  async connect() {
    return {
      web5: this,
      did: 'did:example:mocked'
    };
  }
}

module.exports = new MockWeb5();
