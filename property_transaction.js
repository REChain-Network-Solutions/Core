const Web3Helper = require('./web3_helper');
const Web5Helper = require('./web5_helper');
const Web4Integration = require('./web4_integration');

class PropertyTransaction {
  constructor(web3Provider, web5Options, web4ApiKey) {
    this.web3 = new Web3Helper(web3Provider);
    this.web5 = Web5Helper.init(web5Options);
    this.web4 = new Web4Integration(web4ApiKey);
  }

  async listProperty(propertyDetails, ownerDID) {
    // AI-generated description
    const description = await this.web4.generatePropertyDescription(propertyDetails);
    
    // Store on decentralized storage
    const propertyRecord = {
      ...propertyDetails,
      description,
      ownerDID,
      timestamp: new Date().toISOString()
    };
    
    const recordId = await this.web5.storeData(
      propertyRecord,
      'https://schema.org/RealEstateListing'
    );
    
    // Create NFT on Ethereum
    const txReceipt = await this.web3.sendTransaction(
      ownerDID.ethereumAddress,
      '0xPropertyContract',
      0,
      ownerDID.privateKey,
      {
        data: web3.eth.abi.encodeFunctionCall({
          name: 'mintPropertyNFT',
          type: 'function',
          inputs: [{
            type: 'string',
            name: 'metadataURI'
          }]
        }, [`ipfs://${recordId}`])
      }
    );
    
    return {
      web5RecordId: recordId,
      nftContractAddress: txReceipt.contractAddress,
      tokenId: txReceipt.events.Transfer.returnValues.tokenId
    };
  }

  async executePurchase(buyerDID, propertyRecordId, offerAmount) {
    // Verify property details
    const property = await this.web5.queryData(propertyRecordId);
    
    // AI-powered market validation
    const fairValue = await this.web4.predictMarketValue(property);
    if (offerAmount < fairValue * 0.9) {
      throw new Error('Offer below fair market value');
    }
    
    // Create verifiable credential
    const vc = await this.web5.createVC({
      id: buyerDID,
      financialCapacity: offerAmount * 1.2,
      kycStatus: 'verified'
    }, 'BuyerCredential');
    
    // Execute blockchain transaction
    const tx = await this.web3.sendTransaction(
      buyerDID.ethereumAddress,
      property.nftContractAddress,
      0,
      buyerDID.privateKey,
      {
        data: web3.eth.abi.encodeFunctionCall({
          name: 'purchaseProperty',
          type: 'function',
          inputs: [
            {type: 'uint256', name: 'tokenId'},
            {type: 'uint256', name: 'amount'}
          ]
        }, [property.tokenId, web3.utils.toWei(offerAmount.toString(), 'ether')])
      }
    );
    
    // Update property record
    await this.web5.updateData(propertyRecordId, {
      status: 'sold',
      transactionHash: tx.transactionHash,
      newOwner: buyerDID
    });
    
    return tx;
  }

  async verifyOwnership(propertyRecordId, did) {
    const property = await this.web5.queryData(propertyRecordId);
    const nftOwner = await this.web3.callContract(
      property.nftContractAddress,
      ERC721_ABI,
      'ownerOf',
      [property.tokenId]
    );
    
    return {
      web5Owner: property.newOwner,
      nftOwner,
      verified: property.newOwner === did && nftOwner === did.ethereumAddress
    };
  }
}

module.exports = PropertyTransaction;
