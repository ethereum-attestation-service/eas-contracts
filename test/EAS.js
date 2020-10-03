import chai from 'chai';
import { BN, expectRevert } from '@openzeppelin/test-helpers';

const { expect } = chai;

const EAS = artifacts.require('EAS');

contract('EAS', () => {
  describe('construction', async () => {
    let eas;

    beforeEach(async () => {
      eas = await EAS.new();
    });

    it('should report a version', async () => {
      expect(await eas.VERSION.call()).to.be.eql('0.1');
    });

    it('should initilize without any attestations categories or attestations', async () => {
      expect(await eas.attestationsCount.call()).to.be.bignumber.equal(new BN(0));
    });
  });
});
