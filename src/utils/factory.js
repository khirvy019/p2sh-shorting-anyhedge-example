import { hash256 } from "@cashscript/utils"
import { compileFile } from 'cashc'
import { hexToBin } from '@bitauth/libauth';
import { Contract } from 'cashscript';
import { getBaseBytecode } from "./anyhedge.js"
import { wifToPubkey } from "./crypto.js"

/**
 * @param {Object} opts 
 * @param {String} opts.ownerWif
 */
export function createTreasuryContract(opts) {
  const oraclePubkey = '02d09db08af1ff4e8453919cc866a4be427d7bfe18f2c05e5444c196fcf6fd2818';

  const ownerWif = opts?.ownerWif
  const pubkey = wifToPubkey(ownerWif)

  const { bytecode: anyhedgeBaseBytecode, version: anyhedgeVersion } = getBaseBytecode();

  // const artifact = compileFile('src/contract.cash');
  const artifact = compileFile(new URL('../contract.cash', import.meta.url));

  
  const params = [
    hexToBin(pubkey),
    hash256(hexToBin(anyhedgeBaseBytecode)),
    hexToBin(oraclePubkey),
  ]

  const contract = new Contract(artifact, params, { addressType: 'p2sh32' });

  return {
    contract,
    oraclePubkey,
    ownerWif,
    pubkey,
    anyhedgeBaseBytecode,
    anyhedgeVersion,
  }
}
