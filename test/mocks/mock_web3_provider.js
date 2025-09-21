const EventEmitter = require('events');

class MockWeb3Provider extends EventEmitter {
  constructor() {
    super();
    this.eth = {
      getBalance: async (address) => {
        return '1000000000000000000'; // 1 ETH in wei
      },
      Contract: class {
        constructor(abi, address) {
          this.abi = abi;
          this.address = address;
          this.methods = {
            testMethod: () => ({
              call: async () => 'mocked contract call result'
            })
          };
          this.events = {
            TestEvent: () => {
              const emitter = new EventEmitter();
              setTimeout(() => {
                emitter.emit('data', { event: 'TestEvent', returnValues: {} });
              }, 100);
              return emitter;
            }
          };
        }
      },
      accounts: {
        signTransaction: async (tx, privateKey) => {
          return { rawTransaction: 'mockedRawTx' };
        }
      },
      sendSignedTransaction: async (rawTx) => {
        return 'mockedTxHash';
      }
    };
    this.utils = {
      toWei: (value, unit) => {
        if (unit === 'ether') {
          return (parseFloat(value) * 1e18).toString();
        }
        return value.toString();
      }
    };
  }
}

module.exports = MockWeb3Provider;
