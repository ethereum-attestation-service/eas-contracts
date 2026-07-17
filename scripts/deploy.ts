/**
 * Deploy the EAS protocol (SchemaRegistry → EAS → EIP712Proxy → Indexer) to a
 * configured network and emit hardhat-deploy-style JSON artifacts under
 * `deployments/<network>/`. The repo does not use the hardhat-deploy plugin;
 * this script writes the artifact format directly to keep the resulting PR
 * mechanically identical to prior "Add <Chain>" commits.
 *
 * Gas-pricing policy (PulseChain-aware):
 *   maxPriorityFeePerGas = current baseFee   (capped at baseFee — never higher)
 *   maxFeePerGas         = 2 * baseFee + maxPriorityFee
 * This intentionally ignores the RPC's `eth_maxPriorityFeePerGas` suggestion,
 * which on PulseChain is often inflated relative to actual inclusion economics.
 *
 * Tx-safety policy:
 *   - Each deploy waits for CONFIRMATIONS confirmations before the next is
 *     broadcast, so we never have multiple in-flight pending txs.
 *   - After each deploy, we verify the signer's nonce advanced by exactly +1
 *     and that getCode(address) is non-empty.
 *   - On mainnet, the script prints a pre-flight summary and sleeps 5s so the
 *     user has a final Ctrl+C window before any tx is signed.
 *
 * Usage (with env vars exported or via dotenvx):
 *   pnpm hardhat run scripts/deploy.ts --network pulsechain-testnet
 *   pnpm hardhat run scripts/deploy.ts --network pulsechain
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import hre, { ethers, network } from 'hardhat';
import type { BaseContract, Log } from 'ethers';

const EIP712_PROXY_NAME = 'EAS';
const CONFIRMATIONS = 3;
const MAINNET_PREFLIGHT_DELAY_MS = 5_000;

interface DeployedRecord {
  name: string;
  address: string;
  args: unknown[];
  txHash: string;
  blockNumber: number;
}

interface GasOverrides {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
}

const log = (msg: string) => {
  // eslint-disable-next-line no-console
  console.log(msg);
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const formatGwei = (wei: bigint) => `${ethers.formatUnits(wei, 'gwei')} gwei`;

const networkDir = () => join(__dirname, '..', 'deployments', network.name);

const ensureDeploymentDir = () => {
  const dir = networkDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const writeChainId = async () => {
  const chainId = network.config.chainId;
  if (!chainId) {
    throw new Error(`network.config.chainId is unset for "${network.name}"`);
  }
  writeFileSync(join(networkDir(), '.chainId'), `${chainId}\n`);
};

const writeMigrations = (records: DeployedRecord[]) => {
  const slugs: Record<string, string> = {
    SchemaRegistry: '000001-registry',
    EAS: '000002-eas',
    EIP712Proxy: '000005-eip712-proxy',
    Indexer: '000006-indexer'
  };
  const now = Math.floor(Date.now() / 1000);
  const migrations: Record<string, number> = {};
  for (const r of records) {
    const slug = slugs[r.name];
    if (!slug) continue;
    migrations[slug] = now;
  }
  writeFileSync(join(networkDir(), '.migrations.json'), `${JSON.stringify(migrations, null, 2)}\n`);
};

const writeArtifact = async (record: DeployedRecord) => {
  const artifact = await hre.artifacts.readArtifact(record.name);
  const receipt = await ethers.provider.getTransactionReceipt(record.txHash);

  const out = {
    address: record.address,
    abi: artifact.abi,
    transactionHash: record.txHash,
    args: record.args,
    numDeployments: 1,
    receipt: receipt
      ? {
          to: receipt.to,
          from: receipt.from,
          contractAddress: receipt.contractAddress,
          transactionIndex: receipt.index,
          gasUsed: receipt.gasUsed.toString(),
          logsBloom: receipt.logsBloom,
          blockHash: receipt.blockHash,
          transactionHash: receipt.hash,
          logs: receipt.logs.map((entry: Log) => ({
            transactionIndex: entry.transactionIndex,
            blockNumber: entry.blockNumber,
            transactionHash: entry.transactionHash,
            address: entry.address,
            topics: [...entry.topics],
            data: entry.data,
            logIndex: entry.index,
            blockHash: entry.blockHash
          })),
          blockNumber: receipt.blockNumber,
          cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
          status: receipt.status,
          type: receipt.type
        }
      : undefined,
    bytecode: artifact.bytecode,
    deployedBytecode: artifact.deployedBytecode
  };

  writeFileSync(join(networkDir(), `${record.name}.json`), `${JSON.stringify(out, null, 2)}\n`);
};

/**
 * Compute gas overrides from the live base fee, ignoring the RPC's priority-fee
 * suggestion. Policy: maxPriorityFee = baseFee (capped). maxFee = 2*baseFee +
 * priority, giving headroom for one base-fee doubling between estimation and
 * inclusion (EIP-1559 base fee can rise at most 12.5% per block, so 2x covers
 * ~6 blocks of monotonic increase).
 *
 * If the chain reports no baseFeePerGas (legacy / pre-1559), fall back to
 * gasPrice from feeData and warn — this should not happen on PulseChain.
 */
const computeGasOverrides = async (): Promise<GasOverrides> => {
  const latest = await ethers.provider.getBlock('latest');
  if (!latest) {
    throw new Error('Could not fetch latest block to compute gas overrides');
  }

  if (latest.baseFeePerGas !== null && latest.baseFeePerGas !== undefined) {
    const baseFee = latest.baseFeePerGas;
    const maxPriorityFeePerGas = baseFee;
    const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;
    log(
      `  gas: baseFee=${formatGwei(baseFee)}  ` +
        `maxPriorityFee=${formatGwei(maxPriorityFeePerGas)}  ` +
        `maxFee=${formatGwei(maxFeePerGas)} (capped policy: priorityFee ≤ baseFee)`
    );
    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  log('  WARNING: latest block has no baseFeePerGas — falling back to legacy gasPrice');
  const feeData = await ethers.provider.getFeeData();
  if (!feeData.gasPrice) {
    throw new Error('No gasPrice available from RPC and no baseFeePerGas — cannot price tx');
  }
  log(`  gas: gasPrice=${formatGwei(feeData.gasPrice)} (legacy)`);
  return { gasPrice: feeData.gasPrice };
};

const deploy = async <T extends BaseContract>(
  name: string,
  args: unknown[],
  signerAddress: string
): Promise<{ contract: T; record: DeployedRecord }> => {
  log(`\n→ Deploying ${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`);

  const nonceBefore = await ethers.provider.getTransactionCount(signerAddress, 'latest');
  log(`  nonce before: ${nonceBefore}`);

  const overrides = await computeGasOverrides();

  const factory = await ethers.getContractFactory(name);
  // Generic factory's deploy signature is `(...args, overrides?)`. Cast through
  // `any` so we can pass through the runtime args without re-deriving the
  // typechain factory's exact parameter tuple.
  const deployFn = factory.deploy.bind(factory) as (...passthrough: unknown[]) => Promise<BaseContract>;
  const contract = (await deployFn(...args, overrides)) as T;
  const tx = contract.deploymentTransaction();
  if (!tx) {
    throw new Error(`No deployment transaction for ${name}`);
  }
  log(`  tx broadcast: ${tx.hash}`);
  log(`  waiting for ${CONFIRMATIONS} confirmation(s)...`);

  const receipt = await tx.wait(CONFIRMATIONS);
  if (!receipt) {
    throw new Error(`No receipt for ${name} deploy after ${CONFIRMATIONS} confirmations`);
  }
  if (receipt.status !== 1) {
    throw new Error(`Deploy of ${name} reverted (status=${receipt.status}, tx=${tx.hash})`);
  }

  const address = await contract.getAddress();

  // Verify code is actually present at the address.
  const code = await ethers.provider.getCode(address);
  if (code === '0x' || code === '0x0') {
    throw new Error(`No bytecode at ${address} after deploy of ${name}`);
  }

  // Verify nonce advanced by exactly 1 — protects against silent broadcast of
  // a second tx, or a stuck pending tx eating our nonce.
  const nonceAfter = await ethers.provider.getTransactionCount(signerAddress, 'latest');
  if (nonceAfter !== nonceBefore + 1) {
    throw new Error(
      `Nonce did not advance by 1: before=${nonceBefore} after=${nonceAfter}. ` +
        `Possible stuck pending tx or reorg — investigate before next deploy.`
    );
  }

  log(`  address:  ${address}`);
  log(`  gasUsed:  ${receipt.gasUsed.toString()}`);
  log(`  effective: ${formatGwei(receipt.gasPrice)}`);
  log(`  block:    ${receipt.blockNumber}`);
  log(`  nonce after: ${nonceAfter}`);

  return {
    contract,
    record: {
      name,
      address,
      args,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    }
  };
};

const main = async () => {
  if (network.name === 'hardhat') {
    log('WARNING: deploying to the in-process hardhat network. Use --network pulsechain[-testnet] for real deploys.');
  }

  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error('No signer available. Set DEPLOYER_PRIVATE_KEY in env.');
  }
  const signerAddress = await signer.getAddress();
  const balance = await ethers.provider.getBalance(signerAddress);
  const startingNonce = await ethers.provider.getTransactionCount(signerAddress, 'latest');

  log('=== Pre-flight ===');
  log(`Network:       ${network.name} (chainId ${network.config.chainId})`);
  log(`Deployer:      ${signerAddress}`);
  log(`Balance:       ${ethers.formatEther(balance)} (native)`);
  log(`Starting nonce: ${startingNonce}`);
  log(`Confirmations per deploy: ${CONFIRMATIONS}`);
  log('Plan: SchemaRegistry → EAS(registry) → EIP712Proxy(eas, "EAS") → Indexer(eas)');

  if (network.name === 'pulsechain') {
    log(`\n⚠️  MAINNET deploy. Sleeping ${MAINNET_PREFLIGHT_DELAY_MS / 1000}s — Ctrl+C to abort.`);
    await sleep(MAINNET_PREFLIGHT_DELAY_MS);
  }

  ensureDeploymentDir();
  await writeChainId();

  // 000001-registry
  const { contract: registry, record: registryRec } = await deploy<BaseContract>(
    'SchemaRegistry',
    [],
    signerAddress
  );

  // 000002-eas
  const { contract: eas, record: easRec } = await deploy<BaseContract>(
    'EAS',
    [await registry.getAddress()],
    signerAddress
  );

  // 000005-eip712-proxy
  const { record: proxyRec } = await deploy<BaseContract>(
    'EIP712Proxy',
    [await eas.getAddress(), EIP712_PROXY_NAME],
    signerAddress
  );

  // 000006-indexer
  const { record: indexerRec } = await deploy<BaseContract>(
    'Indexer',
    [await eas.getAddress()],
    signerAddress
  );

  const records = [registryRec, easRec, proxyRec, indexerRec];

  // Write artifacts.
  for (const r of records) {
    await writeArtifact(r);
  }
  writeMigrations(records);

  // Sanity: EAS.getSchemaRegistry() must equal registry address.
  const wiredRegistry = await (eas as unknown as { getSchemaRegistry(): Promise<string> }).getSchemaRegistry();
  if (wiredRegistry.toLowerCase() !== registryRec.address.toLowerCase()) {
    throw new Error(`EAS.getSchemaRegistry() = ${wiredRegistry} !== ${registryRec.address}`);
  }

  // Final nonce check — total deploys should match.
  const finalNonce = await ethers.provider.getTransactionCount(signerAddress, 'latest');
  if (finalNonce !== startingNonce + records.length) {
    throw new Error(
      `Final nonce mismatch: starting=${startingNonce} final=${finalNonce} ` +
        `expected=${startingNonce + records.length}. Some tx may have been broadcast unexpectedly.`
    );
  }

  log('\n=== Summary ===');
  log(`Network: ${network.name} (chainId ${network.config.chainId})`);
  log(`Deployer: ${signerAddress}`);
  log(`Final nonce: ${finalNonce} (advanced by ${finalNonce - startingNonce})`);
  log('Addresses:');
  for (const r of records) {
    log(`  ${r.name.padEnd(16)} ${r.address}`);
  }
  log(`\n✓ Artifacts written to deployments/${network.name}/`);

  // Hint for verification.
  log('\nNext: verify on the explorer:');
  for (const r of records) {
    const argList = r.args.map((a) => JSON.stringify(a)).join(' ');
    log(`  pnpm hardhat verify --network ${network.name} ${r.address} ${argList}`);
  }
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
