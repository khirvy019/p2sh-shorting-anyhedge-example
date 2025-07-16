import 'dotenv/config'
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
  const oraclePubkey = process.env.ORACLE_PUBKEY

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
