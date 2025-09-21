import React, { useState, useEffect } from 'react';
import { Web5 } from '@web5/api';
import { PropertyTransaction } from '../property_transaction';

const PropertyManager = ({ web3Provider, web4ApiKey }) => {
  const [web5, setWeb5] = useState(null);
  const [did, setDID] = useState('');
  const [propertyTx, setPropertyTx] = useState(null);
  const [properties, setProperties] = useState([]);
  
  useEffect(() => {
    const init = async () => {
      const { web5, did } = await Web5.connect();
      setWeb5(web5);
      setDID(did);
      
      setPropertyTx(new PropertyTransaction(
        web3Provider,
        { web5, did },
        web4ApiKey
      ));
    };
    init();
  }, []);
  
  const listProperty = async () => {
    const newProperty = {
      address: '123 Blockchain Ave',
      size: '2000 sqft',
      price: 500000,
      features: ['Smart Home', 'Solar']
    };
    
    const listing = await propertyTx.listProperty(newProperty, did);
    setProperties([...properties, listing]);
  };
  
  const purchaseProperty = async (propertyId) => {
    await propertyTx.executePurchase(did, propertyId, 495000);
    setProperties(properties.filter(p => p.web5RecordId !== propertyId));
  };
  
  return (
    <div className="property-manager">
      <h2>Your Properties</h2>
      <button onClick={listProperty}>List New Property</button>
      
      <div className="property-list">
        {properties.map(property => (
          <div key={property.web5RecordId} className="property-card">
            <h3>{property.details.address}</h3>
            <p>Value: ${property.details.price}</p>
            <button onClick={() => purchaseProperty(property.web5RecordId)}>
              Purchase
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyManager;
