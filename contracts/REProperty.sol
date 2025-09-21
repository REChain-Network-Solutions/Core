// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract REProperty is ERC721, Ownable {
    struct Property {
        string did; // Web5 DID reference
        uint256 value;
        address owner;
        bool forSale;
    }

    mapping(uint256 => Property) public properties;
    uint256 public nextTokenId = 1;

    constructor() ERC721("REProperty", "REP") {}

    function mintProperty(string memory _did, uint256 _value) external onlyOwner {
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        properties[tokenId] = Property({
            did: _did,
            value: _value,
            owner: msg.sender,
            forSale: false
        });
    }

    function listForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not property owner");
        properties[tokenId].value = price;
        properties[tokenId].forSale = true;
    }

    function purchaseProperty(uint256 tokenId) external payable {
        Property storage property = properties[tokenId];
        require(property.forSale, "Property not for sale");
        require(msg.value >= property.value, "Insufficient funds");
        
        address previousOwner = ownerOf(tokenId);
        _transfer(previousOwner, msg.sender, tokenId);
        
        payable(previousOwner).transfer(msg.value);
        property.owner = msg.sender;
        property.forSale = false;
    }

    function getPropertyDID(uint256 tokenId) external view returns (string memory) {
        return properties[tokenId].did;
    }
}
