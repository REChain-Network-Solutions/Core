const MockWeb3Provider = require('./test/mocks/mock_web3_provider');

class Web3Helper {
  constructor(providerUrl) {
    if (providerUrl === 'mock') {
      this.web3 = new MockWeb3Provider();
    } else {
      const { Web3 } = require('web3');
      this.web3 = new Web3(providerUrl);
    }
  }

  async getBalance(address) {
    return this.web3.eth.getBalance(address);
  }

  async callContract(contractAddress, abi, methodName, params = []) {
    const contract = new this.web3.eth.Contract(abi, contractAddress);
    return contract.methods[methodName](...params).call();
  }

  async sendTransaction(from, to, value, privateKey) {
    const tx = {
      from,
      to,
      value: this.web3.utils.toWei(value.toString(), 'ether'),
      gas: 21000,
    };
    
    const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
    return this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  }

  async subscribeToEvent(contractAddress, abi, eventName, callback) {
    const contract = new this.web3.eth.Contract(abi, contractAddress);
    contract.events[eventName]()
      .on('data', event => callback(null, event))
      .on('error', error => callback(error, null));
  }
}

module.exports = Web3Helper;
