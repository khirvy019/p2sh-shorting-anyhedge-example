import { cashAddressToLockingBytecode } from "@bitauth/libauth";
import { AnyHedgeManager } from "@generalprotocols/anyhedge";
import { getAnyhedgeSettlementTxFeeSize, getFeeSats, getLiquidityFee, getSettlementServiceFee } from "./utils/anyhedge-funding.js";
import { calculateInputSize } from "./utils/contracts.js";

/**
 * @param {Object} opts 
 * @param {import("@generalprotocols/anyhedge").ContractData} opts.contractData
 * @param {import("cashscript").Transaction} opts.transaction
 */
export function calculateFundingAmounts(opts) {
  const contractData = opts?.contractData;
  const transaction = opts?.transaction;
  const calculatedSettlementTxFee = getAnyhedgeSettlementTxFeeSize({ contractData });

  // this is how much sats needed in anyhedge contract's UTXO
  const totalFundingSats = contractData.metadata.shortInputInSatoshis +
                          contractData.metadata.longInputInSatoshis +
                          calculatedSettlementTxFee + 1332n;

  const decodedAddress = cashAddressToLockingBytecode(contractData.address)
  if (typeof decodedAddress === 'string') throw new Error(decodedAddress)
  const outputSize = BigInt(decodedAddress.bytecode.byteLength) + 9n;
  const tcInputSize = BigInt(calculateInputSize(transaction));

  let addtlFeeSats = 0n;
  const lpFee = getLiquidityFee(contractData);
  if (lpFee) {
    if (typeof lpFee === 'string') throw new Error(lpFee)
    addtlFeeSats += getFeeSats(lpFee)
  }

  const settlementServiceFee = getSettlementServiceFee(contractData);
  if (settlementServiceFee) {
    if (typeof settlementServiceFee === 'string') throw new Error(settlementServiceFee)
    addtlFeeSats += getFeeSats(settlementServiceFee);
  }

  const P2PKH_INPUT_SIZE = 148n; // in some libraries it's 141n but others is 148, just following anyhedge's constants.js
  const p2shMinerFeeSatoshis = outputSize + P2PKH_INPUT_SIZE + tcInputSize + 10n;
  const p2shTotalFundingSats = totalFundingSats + addtlFeeSats + p2shMinerFeeSatoshis;
  
  // const p2pkhMinerFeeSatoshis = outputSize + (P2PKH_INPUT_SIZE * 2n) + 10n;
  // const p2pkhTotalFundingSats = totalFundingSats + addtlFeeSats + p2pkhMinerFeeSatoshis;

  const longFundingSats = contractData.metadata.longInputInSatoshis;

  const manager = new AnyHedgeManager({ contractVersion: contractData.version })
  const anyhedgeTotalFundingSats = manager.calculateTotalRequiredFundingSatoshis(contractData)

  return {
    totalFundingSats: totalFundingSats,
    shortFundingUtxoSats: p2shTotalFundingSats - longFundingSats,
    longFundingSats: longFundingSats,

    calculatedSettlementTxFee: calculatedSettlementTxFee,

    // data here just for reference
    anyhedgeOriginalCalculations: {
      anyhedgeTotalFundingSats: anyhedgeTotalFundingSats,
      short: anyhedgeTotalFundingSats - longFundingSats,
      long: longFundingSats,
      settlementTxFee: contractData.metadata.minerCostInSatoshis,
    },
  }
}