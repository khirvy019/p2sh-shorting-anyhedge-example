import { binToHex, decodeTransactionCommon, hexToBin } from "@bitauth/libauth";

export function extractUnlockingBytecode(txHex, index=0) {
  const decodedTx = decodeTransactionCommon(hexToBin(txHex));
  if (typeof decodedTx === 'string') throw new Error(decodedTx);

  return binToHex(decodedTx.inputs[index].unlockingBytecode);
}

/**
 * 
 * @param {import("cashscript").Utxo[]} utxos 
 */
export function groupUtxoAssets(utxos) {
  const assets = {
    totalSats: 0n,
    fungibleTokens: [].map(() => ({
      category: '', amount: 0n,
    })),
    nfts: [].map(() => ({
      category: '', capability: '', commitment: '',
    }))
  }

  utxos.forEach(utxo => {
    assets.totalSats += utxo.satoshis
    if (!utxo.token) return
    const token = utxo.token

    if (token.amount) {
      const tokenBalance = assets.fungibleTokens.find(tokenBal => tokenBal.category === token.category)
      if (tokenBalance) tokenBalance.amount += token.amount
      else assets.fungibleTokens.push({ category: token.category, amount: token.amount })
    }

    if (token.nft) {
      assets.nfts.push({
        category: token.category,
        capability: token.nft.capability,
        commitment: token.nft.commitment,
      })
    }
  })

  return assets
}
