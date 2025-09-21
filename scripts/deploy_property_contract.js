const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

async function main() {
  const web3 = new Web3('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
  const account = web3.eth.accounts.privateKeyToAccount(
    process.env.DEPLOYER_PRIVATE_KEY
  );
  
  const contractSource = fs.readFileSync(
    path.resolve(__dirname, '../contracts/REProperty.sol'),
    'utf8'
  );
  
  const compiled = await web3.eth.compile.solidity(contractSource);
  const contractABI = compiled.REProperty.info.abiDefinition;
  const bytecode = compiled.REProperty.evm.bytecode.object;
  
  const contract = new web3.eth.Contract(contractABI);
  const deployTx = contract.deploy({
    data: '0x' + bytecode
  });
  
  const gasEstimate = await deployTx.estimateGas();
  const deployedContract = await deployTx.send({
    from: account.address,
    gas: gasEstimate
  });
  
  console.log('Contract deployed at:', deployedContract.options.address);
}

main().catch(console.error);
