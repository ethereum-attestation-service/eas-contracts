import { deployments } from 'hardhat';
import { Suite } from 'mocha';
import { deploymentMetadata, deploymentTagExists, isLive } from '../../utils/Deploy';

const { run } = deployments;

interface Options {
  skip?: () => boolean;
  beforeDeployments?: () => Promise<void>;
}

export const describeDeployment = (
  filename: string,
  fn: (this: Suite) => void,
  options: Options = {}
): Suite | void => {
  const { id, tag } = deploymentMetadata(filename);

  const { skip = () => false, beforeDeployments = () => Promise.resolve() } = options;

  // if we're running against a mainnet fork, ensure to skip tests for already existing deployments
  if (skip() || deploymentTagExists(tag)) {
    return describe.skip(id, fn);
  }

  return describe(id, function (this: Suite) {
    before(async () => {
      if (isLive()) {
        throw new Error('Unsupported network');
      }

      await beforeDeployments();
    });

    beforeEach(() => {
      if (isLive()) {
        throw new Error('Unsupported network');
      }

      return run(tag, {
        resetMemory: false,
        deletePreviousDeployments: false,
        writeDeploymentsToFiles: true
      });
    });

    fn.apply(this);
  });
};
