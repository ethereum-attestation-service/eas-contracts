// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// prettier-ignore
import {
    AttestationRequestData,
    AttestationRequest,
    MultiAttestationRequest,
    RevocationRequestData,
    RevocationRequest,
    MultiRevocationRequest
} from "./IEAS.sol";

import { Attestation, EIP712Signature } from "./Common.sol";

/**
 * @dev A struct representing the full arguments of the full delegated attestation request.
 */
struct DelegatedAttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData data; // The arguments of the attestation request.
    EIP712Signature signature; // The EIP712 signature data.
    address attester; // The attesting account.
}

/**
 * @dev A struct representing the full arguments of the delegated multi attestation request.
 */
struct MultiDelegatedAttestationRequest {
    bytes32 schema; // The unique identifier of the schema.
    AttestationRequestData[] data; // The arguments of the attestation requests.
    EIP712Signature[] signatures; // The EIP712 signatures data. Please note that the signatures are assumed to be signed with increasing nonces.
    address attester; // The attesting account.
}

/**
 * @dev A struct representing the arguments of the full delegated revocation request.
 */
struct DelegatedRevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData data; // The arguments of the revocation request.
    EIP712Signature signature; // The EIP712 signature data.
    address revoker; // The revoking account.
}

/**
 * @dev A struct representing the full arguments of the delegated multi revocation request.
 */
struct MultiDelegatedRevocationRequest {
    bytes32 schema; // The unique identifier of the schema.
    RevocationRequestData[] data; // The arguments of the revocation requests.
    EIP712Signature[] signatures; // The EIP712 signatures data. Please note that the signatures are assumed to be signed with increasing nonces.
    address revoker; // The revoking account.
}

/**
 * @title IEASDelegated - Ethereum Attestation Service delegated interface.
 */
interface IEASDelegated {
    /**
     * @dev Attests to a specific schema via the provided EIP712 signature.
     *
     * @param delegatedRequest The arguments of the delegated attestation request.
     *
     * Example:
     *
     * attestByDelegation({
     *     schema: '0x8e72f5bc0a8d4be6aa98360baa889040c50a0e51f32dbf0baa5199bd93472ebc',
     *     data: {
     *         recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
     *         expirationTime: 1673891048,
     *         revocable: true,
     *         refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
     *         data: '0x1234',
     *         value: 0
     *     },
     *     signature: {
     *         v: 28,
     *         r: '0x148c...b25b',
     *         s: '0x5a72...be22'
     *     },
     *     attester: '0xc5E8740aD971409492b1A63Db8d83025e0Fc427e'
     * })
     *
     * @return The UID of the new attestation.
     */
    function attestByDelegation(
        DelegatedAttestationRequest calldata delegatedRequest
    ) external payable returns (bytes32);

    /**
     * @dev Attests to multiple schemas using via provided EIP712 signatures.
     *
     * @param multiDelegatedRequests The arguments of the delegated multi attestation requests. The requests should be
     * grouped by distinct schema ids to benefit from the best batching optimization.
     *
     * Example:
     *
     * multiAttestByDelegation([{
     *     schema: '0x8e72f5bc0a8d4be6aa98360baa889040c50a0e51f32dbf0baa5199bd93472ebc',
     *     data: [{
     *         recipient: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
     *         expirationTime: 1673891048,
     *         revocable: true,
     *         refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
     *         data: '0x1234',
     *         value: 0
     *     },
     *     {
     *         recipient: '0xdEADBeAFdeAdbEafdeadbeafDeAdbEAFdeadbeaf',
     *         expirationTime: 0,
     *         revocable: false,
     *         refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
     *         data: '0x00',
     *         value: 0
     *     }],
     *     signatures: [{
     *         v: 28,
     *         r: '0x148c...b25b',
     *         s: '0x5a72...be22'
     *     },
     *     {
     *         v: 28,
     *         r: '0x487s...67bb',
     *         s: '0x12ad...2366'
     *     }],
     *     attester: '0x1D86495b2A7B524D747d2839b3C645Bed32e8CF4'
     * }])
     *
     * @return The UIDs of the new attestations.
     */
    function multiAttestByDelegation(
        MultiDelegatedAttestationRequest[] calldata multiDelegatedRequests
    ) external payable returns (bytes32[] memory);

    /**
     * @dev Revokes an existing attestation to a specific schema via the provided EIP712 signature.
     *
     * Example:
     *
     * revokeByDelegation({
     *     schema: '0x8e72f5bc0a8d4be6aa98360baa889040c50a0e51f32dbf0baa5199bd93472ebc',
     *     data: {
     *         uid: '0xcbbc12102578c642a0f7b34fe7111e41afa25683b6cd7b5a14caf90fa14d24ba',
     *         value: 0
     *     },
     *     signature: {
     *         v: 27,
     *         r: '0xb593...7142',
     *         s: '0x0f5b...2cce'
     *     },
     *     revoker: '0x244934dd3e31bE2c81f84ECf0b3E6329F5381992'
     * })
     *
     * @param delegatedRequest The arguments of the delegated revocation request.
     */
    function revokeByDelegation(DelegatedRevocationRequest calldata delegatedRequest) external payable;

    /**
     * @dev Revokes existing attestations to multiple schemas via provided EIP712 signatures.
     *
     * @param multiDelegatedRequests The arguments of the delegated multi revocation attestation requests. The requests should be
     * grouped by distinct schema ids to benefit from the best batching optimization.
     *
     * Example:
     *
     * multiRevokeByDelegation([{
     *     schema: '0x8e72f5bc0a8d4be6aa98360baa889040c50a0e51f32dbf0baa5199bd93472ebc',
     *     data: [{
     *         uid: '0x211296a1ca0d7f9f2cfebf0daaa575bea9b20e968d81aef4e743d699c6ac4b25',
     *         value: 1000
     *     },
     *     {
     *         uid: '0xe160ac1bd3606a287b4d53d5d1d6da5895f65b4b4bab6d93aaf5046e48167ade',
     *         value: 0
     *     }],
     *     signatures: [{
     *         v: 28,
     *         r: '0x148c...b25b',
     *         s: '0x5a72...be22'
     *     },
     *     {
     *         v: 28,
     *         r: '0x487s...67bb',
     *         s: '0x12ad...2366'
     *     }],
     *     revoker: '0x244934dd3e31bE2c81f84ECf0b3E6329F5381992'
     * }])
     *
     */
    function multiRevokeByDelegation(
        MultiDelegatedRevocationRequest[] calldata multiDelegatedRequests
    ) external payable;
}
