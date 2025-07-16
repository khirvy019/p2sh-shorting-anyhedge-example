import 'dotenv/config'
import { AnyHedgeManager } from "@generalprotocols/anyhedge";
import { generateRandomWif } from "./utils/crypto.js";
import { createTreasuryContract } from "./utils/factory.js";
import { fundContract, getContractStatus, getLiquidityServiceInformation, prepareContractPosition, proposeContractPosition } from "./utils/lp-api.js";
import { getOraclePrices } from "./utils/oracle.js";
import { getContractAccessKeys } from "./utils/anyhedge.js";
import { calculateFundingAmounts } from "./calculate.js";
import { prepareParamForTreasuryContract } from "./utils/anyhedge-funding.js";
import { randomUtxo, SignatureTemplate } from "cashscript";
import { hashTransaction, hexToBin } from "@bitauth/libauth";
import { constructFundingOutputs } from "@generalprotocols/anyhedge/build/lib/util/funding-util.js";
import { extractUnlockingBytecode } from "./utils/transaction.js";
import { libauthOutputToCashScriptOutput } from "cashscript/dist/utils.js";
const printDivider = () => console.log('\n\n============================================================================================================\n\n');

// you can with generateRandomWif();
const OWNER_WIF = process.env.OWNER_WIF; 
const TREAURY_CONTRACT_UTXOS = [
  // randomUtxo({ satoshis: BigInt(10 ** 8) }),
]

// ================================================================================ //
const { contract, oraclePubkey, anyhedgeVersion, pubkey: ownerPubkey } = createTreasuryContract({ ownerWif: OWNER_WIF });
console.log('SHORTING FUNDS OF CONTRACT:', contract.address);

const lpServiceInfo = await getLiquidityServiceInformation();
const { oracleRelay, settlementService, liquidityParameters } = lpServiceInfo;
const constraints = liquidityParameters[oraclePubkey];

console.log("Liquidity Service Information");
console.log("Oracle relay |", oracleRelay);
console.log("Settlement service |", settlementService);
console.log("Constraints |", constraints);
printDivider();

const prices = await getOraclePrices({pubkey: oraclePubkey, oracleRelay });
const priceInfo = prices[0];
console.log("Price Info |", priceInfo);
printDivider();

const prepareContractPosData = { oraclePublicKey: oraclePubkey, poolSide: 'long' }
console.log("PREPARE CONTRACT POSITION |", prepareContractPosData);
const counterPartyData = await prepareContractPosition(prepareContractPosData)
console.log("PREPARE CONTRACT POSITION RESULT | ", counterPartyData);
printDivider();
const longAddress = counterPartyData?.liquidityProvidersPayoutAddress;
const longPubkey = counterPartyData?.liquidityProvidersMutualRedemptionPublicKey;

const anyhedgeManager = new AnyHedgeManager({ contractVersion: anyhedgeVersion });
/** @type {import("@generalprotocols/anyhedge").ContractCreationParameters} */
const contractCreationParameters = {
  takerSide: 'short',
  makerSide: 'long',
  nominalUnits: constraints.minimumNominalUnits,
  oraclePublicKey: oraclePubkey,
  startingOracleMessage: priceInfo?.priceMessage?.message,
  startingOracleSignature: priceInfo?.priceMessage?.signature,
  maturityTimestamp: BigInt(priceInfo?.priceData?.messageTimestamp + constraints.minimumDurationInSeconds + 60),
  lowLiquidationPriceMultiplier: 0.5,
  highLiquidationPriceMultiplier: 2,
  isSimpleHedge: 0n,
  shortPayoutAddress: contract.address,
  longPayoutAddress: longAddress,
  enableMutualRedemption: 1n,
  shortMutualRedeemPublicKey: ownerPubkey,
  longMutualRedeemPublicKey: longPubkey,
};
const compiledContractData = await anyhedgeManager.createContract(contractCreationParameters);
console.log('CONTRACT COMPILE RESULT |', compiledContractData)
printDivider();

const proposalData = {
  contractCreationParameters,
  contractStartingOracleMessageSequence: priceInfo?.priceData?.messageSequence,
};
console.log('PROPOSE CONTRACT |', proposalData);
const proposalResult = await proposeContractPosition(proposalData);
console.log('PROPOSE CONTRACT RESULT |', proposalResult);
printDivider();

const accessKeys = await getContractAccessKeys(compiledContractData.address, OWNER_WIF);
const contractStatusFetchOpts = {
  settlementService,
  contractAddress: compiledContractData.address,
  publicKey: ownerPubkey,
  signature: accessKeys.signature,
}
console.log('FETCHING CONTRACT STATUS |', contractStatusFetchOpts);
const contractData = await getContractStatus(contractStatusFetchOpts)
console.log('FULL CONTRACT DATA |', contractData);
printDivider();

const fundingTxBuilder = contract.functions.spendToAnyhedge(...prepareParamForTreasuryContract(contractData))
const fundingAmounts = calculateFundingAmounts({ contractData, transaction: fundingTxBuilder })
console.log('FUNDING AMOUNTS |', fundingAmounts);
printDivider();

const fundingUtxoTxBuilder = contract.functions.unlockWithSig(new SignatureTemplate(OWNER_WIF))
  .withTime(0)
  .from(TREAURY_CONTRACT_UTXOS.length ? TREAURY_CONTRACT_UTXOS : await contract.getUtxos())
  .to(contract.address, fundingAmounts.shortFundingUtxoSats);

const fundingUtxoTx = await fundingUtxoTxBuilder.build();
const fundingUtxoTxid = hashTransaction(hexToBin(fundingUtxoTx));
const fundingUtxo = {
  txid: fundingUtxoTxid,
  vout: 0,
  satoshis: fundingAmounts.shortFundingUtxoSats,
}
console.log('FUNDING UTXO |', fundingUtxo);

fundingTxBuilder.withTime(0)
  .from({
    txid: fundingUtxoTxid,
    vout: 0,
    satoshis: fundingAmounts.shortFundingUtxoSats,
  })
  .from({
    txid: Array.from({ length: 64 }).fill('f').join(''),
    vout: 0,
    satoshis: fundingAmounts.longFundingSats,
    template: new SignatureTemplate(generateRandomWif()),
  })
  .to(constructFundingOutputs(contractData).map(libauthOutputToCashScriptOutput))

const fundingTxHex = await fundingTxBuilder.build();
console.log('Funding transaction hex:', fundingTxHex);
printDivider();

const fundingProposal = {
  contractAddress: contractData.address,
  outpointTransactionHash: fundingUtxoTxid,
  outpointIndex: 0,
  satoshis: fundingAmounts.shortFundingUtxoSats,
  takerSide: contractData.metadata.takerSide,
  dependencyTransactions: fundingUtxoTxBuilder.inputs.map(utxo => utxo.txid),
  oracleMessageSequence: priceInfo?.priceData?.messageSequence,
  unlockingScript: extractUnlockingBytecode(fundingTxHex, 0),
}

printDivider();
console.log('Broadcasting funding UTXO tx');
console.log('BROADCAST RESULT', await fundingUtxoTxBuilder.send());
printDivider();

console.log('FUNDING PROPOSAL |', fundingProposal);
const fundingResult = await fundContract(fundingProposal);
console.log('FUNDING PROPOSAL RESULT |', fundingResult);
