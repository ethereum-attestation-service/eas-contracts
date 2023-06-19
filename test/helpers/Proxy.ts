import { expect } from 'chai';
import { deployments } from 'hardhat';
import { findLast } from 'lodash';

const GAP_LABEL = '__gap';
const MAX_GAP_SIZE = 50;
const GAP_SIZE_REGEXP = /\(t_uint256\)(.*?)_storage/i;

// verifies that an upgradeable contract has properly defined its forward-compatibility storage gap and that its whole
// contract-level specific storage equals exactly to the MAX_GAP_SIZE slots
export const shouldHaveGap = (contractName: string, firstStateVariable?: string) => {
  it(`${contractName} should have only ${MAX_GAP_SIZE} contract-level specific storage slots`, async () => {
    const extendedArtifact = await deployments.getExtendedArtifact(contractName);
    const {
      storageLayout: { storage }
    } = extendedArtifact;

    const indexOfLast = storage.length - 1;
    const lastStorage = storage[indexOfLast];
    expect(lastStorage.label).to.equal(GAP_LABEL);

    // extract the length of the gap from the spec. For example, for the type "t_array(t_uint256)49_storage", the
    // size of the gap is 49
    const gapSize = Number(lastStorage.type.match(GAP_SIZE_REGEXP)[1]);

    if (firstStateVariable) {
      // if the contract defines any contract-level specific storage - calculate the total number of
      // used slots and make sure that it equals exactly to the MAX_GAP_SIZE slots
      const firstStorage = findLast(storage, (data) => data.label === firstStateVariable);
      expect(lastStorage.slot - firstStorage.slot + gapSize).to.equal(MAX_GAP_SIZE);
    } else {
      // if the contract doesn't define any contract-level specific storage variables (while can still inherit the
      // state of other contracts) - we should only expect the __gap state variable and that's it
      expect(gapSize).to.be.equal(MAX_GAP_SIZE);
    }
  });
};
