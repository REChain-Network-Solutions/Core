const PropertyTransaction = require('../property_transaction');
const { Web5 } = require('@web5/api');

// Initialize with your configurations
const propertyTx = new PropertyTransaction(
  'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
  { /* Web5 configuration */ },
  'your-openai-api-key'
);

async function demoPropertyTransaction() {
  // Seller lists property
  const sellerDID = await Web5.connect();
  const propertyDetails = {
    address: '123 Blockchain Avenue, Crypto City',
    size: '2000 sqft',
    price: 500000,
    features: ['Smart Home', 'Solar Roof', 'Pool']
  };

  const listing = await propertyTx.listProperty(propertyDetails, sellerDID);
  console.log('Property listed:', listing);

  // Buyer purchases property
  const buyerDID = await Web5.connect();
  const purchase = await propertyTx.executePurchase(
    buyerDID,
    listing.web5RecordId,
    495000 // Offer amount
  );
  console.log('Purchase completed:', purchase.transactionHash);

  // Verify ownership
  const verification = await propertyTx.verifyOwnership(
    listing.web5RecordId,
    buyerDID
  );
  console.log('Ownership verified:', verification.verified);
}

demoPropertyTransaction().catch(console.error);
