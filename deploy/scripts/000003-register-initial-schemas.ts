import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ZERO_ADDRESS } from '../../utils/Constants';
import { execute, InstanceName, setDeploymentMetadata } from '../../utils/Deploy';
import Logger from '../../utils/Logger';

export const SCHEMAS = [
  { schema: 'bytes32 schemaId,string name', name: 'Name a Schema' },
  { schema: 'bool like', name: 'Like' },
  { schema: 'address contractAddress,bool trusted', name: 'Trust a Contract' },
  {
    schema: 'bytes32 eventId,uint8 ticketType,uint32 ticketNum',
    name: 'Create Event Ticket'
  },
  { schema: 'bool isHuman', name: 'Is a Human' },
  { schema: 'bytes32 name', name: 'Name Something' },
  { schema: 'string message', name: 'Write a Message' },
  { schema: 'string statement', name: 'Make a Statement' },
  { schema: 'bytes32 username', name: 'Username' },
  { schema: 'bool isFriend', name: 'Is a Friend' },
  { schema: 'bool hasPhoneNumber,bytes32 phoneHash', name: 'Has Phone Number' },
  { schema: 'uint256 eventId,uint8 voteIndex', name: 'Vote' },
  { schema: 'bool hasPassedKYC', name: 'Passed KYC' },
  { schema: 'bool isAccreditedInvestor', name: 'Is an Accredited Investor' },
  { schema: 'bytes32 hashOfDocument,string note', name: 'Sign Document' },
  { schema: 'bytes32 contentHash', name: 'Content Hash' },
  {
    schema: 'uint8 holdType,uint8 useType,uint64 expiration,int40[2][] polygonArea',
    name: 'Land Registry'
  },
  {
    schema:
      'string productName,bytes32 productSKU,string origin,string manufacturer,uint64 productionDate,uint64 ' +
      'expirationDate,bytes32 rawMaterialHash,address certifier',
    name: 'Product Origin'
  },
  {
    schema:
      'bytes32 productId,string productName,address producerAddress,bytes32 batchId,uint64 productionDate,uint64 ' +
      'expirationDate',
    name: 'Product Provenance'
  },
  {
    schema: 'string assetName,string assetTicker,uint64 futureDate,uint256 price',
    name: 'Price Prediction'
  },
  {
    schema: 'string assetName,string assetTicker,uint64 timestamp,uint256 price',
    name: 'Price Feed'
  },
  {
    schema: 'bytes32 documentHash,bytes32 notaryCertificate,uint64 notarizationTime',
    name: 'Digital Notary'
  },
  { schema: 'bytes32 passportHash,uint64 expirationDate', name: 'Passport' },
  {
    schema:
      'string projectName,string description,address beneficiary,uint256 amountRequested,uint64 submittedTime,bytes32 proposalHash',
    name: 'Grant Proposal Request'
  },
  {
    schema: 'bytes32 projectId,bytes32 milestoneId,uint256 amount,bool isCompleted',
    name: 'Grant Milestone'
  },
  {
    schema: 'bytes32 projectId,uint256 amountPaid,string memo',
    name: 'Grant Payment'
  },
  {
    schema:
      'string hackathonName,string hackathonId,string projectName,string description,address[] team,uint64 submittedDate',
    name: 'Hackathon Submission'
  },
  {
    schema: 'bytes32 projectId,string projectName,address winnerAddress,uint256 prizeAmount,string projectDescription',
    name: 'Hackathon Winner'
  },
  {
    schema: 'bytes32 productName,string review,uint8 rating',
    name: 'Product Review'
  },
  {
    schema: 'uint64 dateOfProof,uint256 amount,bool hasFunds,bytes32 evidenceHash',
    name: 'Proof of Funds'
  },
  {
    schema: 'string assetName,bool activeHolding,string note',
    name: 'Asset Disclosure'
  },
  { schema: 'string websiteUrl', name: 'Website URL' },
  { schema: 'string twitterHandle', name: 'Twitter Handle' },
  { schema: 'string youtubeChannel', name: 'YouTube Channel' },
  { schema: 'string githubUrl', name: 'GitHub Username' },
  { schema: 'string telegramUsername', name: 'Telegram Username' },
  {
    schema: 'string eventName,string eventLocation,bytes32 eventID,uint64 checkInTime,bytes32 ticketID',
    name: 'Event Attendance'
  },
  {
    schema:
      'string institutionName,string degreeName,uint64 graduationDate,bytes32 transcriptHash,address issuerAddress',
    name: 'Academic Credentials'
  },
  {
    schema: 'string companyName,string role,uint64 startDate,uint64 endDate',
    name: 'Employment Verification'
  },
  {
    schema: 'bytes32 roleId,string role,bytes32[] authorizations',
    name: 'Community Authorization'
  },
  {
    schema: 'bool passedAudit',
    name: 'Contract Audit'
  },
  { schema: 'bool metIRL', name: 'Met in Real Life' },
  { schema: 'bytes32 privateData', name: 'Private Data' },
  { schema: 'bool isTrue', name: 'True' },
  { schema: 'string post', name: 'Post' },
  { schema: 'bool gm', name: 'GM' }
];

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  for (const { schema } of SCHEMAS) {
    const res = await execute({
      name: InstanceName.SchemaRegistry,
      methodName: 'register',
      args: [schema, ZERO_ADDRESS, true],
      from: deployer
    });

    Logger.log(`Registered schema ${schema} with UID ${res.events?.find((e) => e.event === 'Registered').args.uid}`);
  }

  return true;
};

export default setDeploymentMetadata(__filename, func);
