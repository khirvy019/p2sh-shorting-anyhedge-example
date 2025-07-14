import 'dotenv/config';
import { SignatureTemplate } from "cashscript";
import { getOutputSize, getTxSizeWithoutInputs, randomUtxo } from "cashscript/dist/utils.js";
import { pubkeyToAddress, toTokenAddress } from "./utils/crypto.js";
import { createTreasuryContract } from "./utils/factory.js";
import { groupUtxoAssets } from "./utils/transaction.js";
import { calculateInputSize } from "./utils/contracts.js";

// In case you want to sweep funds from main.js
// you can with generateRandomWif();
const OWNER_WIF = process.env.OWNER_WIF; 

const { contract, oraclePubkey, anyhedgeVersion, pubkey: ownerPubkey } = createTreasuryContract({ ownerWif: OWNER_WIF });
const ownerAddress = pubkeyToAddress(ownerPubkey);
const ownerTokenAddress = toTokenAddress(ownerAddress);

console.log('Sweeping funds from contract:', contract.address);

const utxos = await contract.getUtxos();
// const utxos = [randomUtxo(), randomUtxo()];
console.log('UTXOS |', utxos);
const groupedAssets = groupUtxoAssets(utxos);
console.log('GROUPED ASSETS |', groupedAssets);

const txBuilder = contract.functions.unlockWithSig(new SignatureTemplate(OWNER_WIF));
txBuilder.withTime(0);
txBuilder.from(utxos);
groupedAssets.nfts.forEach(nft => {
  txBuilder.to(ownerTokenAddress, 1000n, {
    category: nft.category,
    amount: 0n,
    nft: {
      capability: nft.capability,
      commitment: nft.commitment,
    },
  })
})
groupedAssets.fungibleTokens.forEach(token => {
  txBuilder.to(ownerTokenAddress, 1000n, {
    category: token.category,
    amount: token.amount,
  })
})

const outputSize = getTxSizeWithoutInputs(txBuilder.outputs);
const inputsSize = calculateInputSize(txBuilder) * utxos.length;
const txSize = BigInt(inputsSize + outputSize);

const totalInputs = txBuilder.inputs.reduce((sum, input) => sum + input.satoshis, 0n);
const totalOutputs = txBuilder.outputs.reduce((sum, output) => sum + output.amount, 0n);

const remainingSats = totalInputs - totalOutputs - txSize;

const potentialChangeOutput = { to: ownerAddress, amount: remainingSats }
const changeOutputSize = BigInt(getOutputSize(potentialChangeOutput));
potentialChangeOutput.amount -= changeOutputSize;
if (potentialChangeOutput.amount > 564n) {
  txBuilder.to(potentialChangeOutput.to, potentialChangeOutput.amount);
}
console.log('Constructed inputs & outputs', {
  inputs: txBuilder.inputs,
  outputs: txBuilder.outputs,
})
console.log('Broadcasting');
const result = await txBuilder.send();
console.log('Transaction result:', result);
