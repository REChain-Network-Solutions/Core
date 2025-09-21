const mockWeb5 = require('./test/mocks/mock_web5_dwn');
const { Web5 } = require('@web5/api');

class Web5Helper {
  static async init() {
    try {
      if (process.env.USE_MOCK_WEB5 === 'true') {
        const { web5, did } = await mockWeb5.connect();
        return new Web5Helper(web5, did);
      } else {
        const { web5, did } = await Web5.connect();
        return new Web5Helper(web5, did);
      }
    } catch (error) {
      console.error('Failed to initialize Web5:', error);
      // Return a dummy instance with nulls to allow graceful degradation
      return new Web5Helper(null, null);
    }
  }

  constructor(web5, did) {
    this.web5 = web5;
    this.did = did;
  }

  async createDID() {
    if (!this.did) {
      // Return a dummy DID if initialization failed
      return 'did:example:dummy';
    }
    return this.did;
  }

  async createVC(credentialSubject, type = 'VerifiableCredential') {
    return {
      '@context': 'https://www.w3.org/2018/credentials/v1',
      type: [type],
      issuer: this.did,
      issuanceDate: new Date().toISOString(),
      credentialSubject
    };
  }

  async storeData(data, protocol) {
    const { record } = await this.web5.dwn.records.create({
      data,
      message: {
        protocol,
        schema: 'https://schema.org/Thing',
        dataFormat: 'application/json'
      }
    });
    return record.id;
  }

  async queryData(protocol) {
    return this.web5.dwn.records.query({
      message: {
        filter: {
          protocol,
          dataFormat: 'application/json'
        }
      }
    });
  }

  async authenticateUser() {
    // Placeholder for user authentication flow using DID
    // This could involve DID authentication protocols like DID Auth or OIDC
    return `User authenticated with DID: ${this.did}`;
  }

  async storeDataOnIPFS(data) {
    // Placeholder for integration with IPFS for decentralized storage
    // This requires IPFS client integration and uploading data to IPFS
    // For now, just simulate storing and returning a fake CID
    const fakeCID = 'QmFakeCID1234567890abcdef';
    return fakeCID;
  }
}

module.exports = Web5Helper;
