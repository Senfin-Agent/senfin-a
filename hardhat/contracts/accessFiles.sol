// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DataAccessToken
 * @dev ERC1155 token for accessing synthetic datasets
 */
contract DataAccessToken is ERC1155, Ownable, ERC1155Supply {
    using Strings for uint256;
    
    // Base URI for token metadata
    string private _baseURI;
    
    // Mapping from datasetId to price
    mapping(uint256 => uint256) public datasetPrices;
    
    // Mapping from datasetId to timestamp (for reference)
    mapping(uint256 => string) public datasetTimestamps;
    
    // Events
    event DatasetRegistered(uint256 indexed datasetId, string timestamp, uint256 price);
    event AccessPurchased(address indexed buyer, uint256 indexed datasetId, uint256 price);
    
    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {
        _baseURI = "";
    }
    
    /**
     * @dev Register a new dataset and set its price
     * @param datasetId The ID of the dataset
     * @param timestamp The timestamp of the dataset (for reference)
     * @param price The price to access the dataset in wei
     */
    function registerDataset(uint256 datasetId, string memory timestamp, uint256 price) public onlyOwner {
        require(datasetPrices[datasetId] == 0, "Dataset already registered");
        
        datasetPrices[datasetId] = price;
        datasetTimestamps[datasetId] = timestamp;
        
        emit DatasetRegistered(datasetId, timestamp, price);
    }
    
    /**
     * @dev Purchase access to a dataset
     * @param datasetId The ID of the dataset to purchase
     */
    function purchaseAccess(uint256 datasetId) public payable {
        uint256 price = datasetPrices[datasetId];
        require(price > 0, "Dataset not registered");
        require(msg.value >= price, "Insufficient payment");
        
        // Mint an access token to the buyer
        _mint(msg.sender, datasetId, 1, "");
        
        // Emit event
        emit AccessPurchased(msg.sender, datasetId, price);
        
        // Refund excess payment if any
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }
    
    /**
     * @dev Check if an address has access to a dataset
     * @param account The address to check
     * @param datasetId The ID of the dataset
     * @return bool True if the address has access
     */
    function hasAccess(address account, uint256 datasetId) public view returns (bool) {
        return balanceOf(account, datasetId) > 0;
    }
    
    /**
     * @dev Get the timestamp associated with a dataset ID
     * @param datasetId The ID of the dataset
     * @return string The timestamp
     */
    function getDatasetTimestamp(uint256 datasetId) public view returns (string memory) {
        return datasetTimestamps[datasetId];
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseURI = newBaseURI;
    }
    
    /**
     * @dev Get the URI for a token
     * @param id The token ID
     * @return string The token URI
     */
    function uri(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, id.toString()));
    }
    
    /**
     * @dev Withdraw funds from the contract
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }
    
    // Override the _update function instead of _beforeTokenTransfer
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}