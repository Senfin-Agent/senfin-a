// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title TrustLensVerifier
 * @dev A minimal contract for logging and storing verification results.
 */
contract TrustLensVerifier {
    /// @notice Emitted when a claim is verified
    event ClaimVerified(
        address indexed verifier,
        bytes32 indexed claimHash,
        bool result,
        string reference_ver,
        uint256 timestamp
    );

    /// @dev Structure to store verification details.
    struct Verification {
        address verifier;
        bool result;
        string reference_ver;
        uint256 timestamp;
    }

    /// @dev Mapping from claim hash to an array of verifications.
    mapping(bytes32 => Verification[]) public verifications;

    /**
     * @notice Records a verification for a given claim.
     * @param claimHash The hash of the claim being verified.
     * @param result The boolean result of the verification.
     * @param reference_ver A reference to off-chain data (e.g., IPFS, Recall Network).
     */
    function recordVerification(
        bytes32 claimHash,
        bool result,
        string calldata reference_ver
    ) external {
        Verification memory newVerification = Verification({
            verifier: msg.sender,
            result: result,
            reference_ver: reference_ver,
            timestamp: block.timestamp
        });

        verifications[claimHash].push(newVerification);
        emit ClaimVerified(
            msg.sender,
            claimHash,
            result,
            reference_ver,
            block.timestamp
        );
    }

    /**
     * @notice Returns the number of verifications for a given claim hash.
     * @param claimHash The hash of the claim.
     * @return count The number of verifications recorded.
     */
    function getVerificationCount(
        bytes32 claimHash
    ) external view returns (uint256 count) {
        return verifications[claimHash].length;
    }

    /**
     * @notice Retrieves a specific verification detail by claim hash and index.
     * @param claimHash The hash of the claim.
     * @param index The index of the verification in the array.
     * @return verification The Verification struct.
     */
    function getVerification(
        bytes32 claimHash,
        uint256 index
    ) external view returns (Verification memory verification) {
        require(index < verifications[claimHash].length, "Invalid index");
        return verifications[claimHash][index];
    }
}
