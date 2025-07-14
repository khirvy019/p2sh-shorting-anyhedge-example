import { AnyHedgeArtifacts } from "@generalprotocols/anyhedge-contracts";
import { binToHex, decodePrivateKeyWif, secp256k1, sha256, utf8ToBin } from "@bitauth/libauth";
import { IncorrectWIFError } from "@generalprotocols/anyhedge";
import { baseBytecodeToHex, encodeParameterBytecode } from "./contracts.js";

/**
 * @param {Object} opts
 * @param {String} opts.version
 */
export function getArtifact(opts) {
  let version = opts?.version
  if (version === undefined || version === null) {
    version = "AnyHedge v0.12"
  }

  const artifact = AnyHedgeArtifacts[version]
  return { artifact, version }
}


/**
 * @param {Object} opts
 * @param {String} opts.version
 */
export function getBaseBytecode(opts) {
  const { artifact, version } = getArtifact(opts)
  const baseBytecode = baseBytecodeToHex(artifact.bytecode);
  return { bytecode: baseBytecode, version: version }
}


/**
 * Generate signature and pubkey needed to access the contract in a settlement service
 * @see {@link https://gitlab.com/GeneralProtocols/anyhedge/library/-/blob/v0.14.2/lib/anyhedge.ts#L399} for reference
 * 
 * @param {String} contractAddress 
 * @param {String} privateKeyWIF 
 */
 export async function getContractAccessKeys(contractAddress, privateKeyWIF) {
    const privateKeyBin = decodePrivateKeyWif(privateKeyWIF).privateKey
	if(typeof privateKeyBin === 'string') throw(new IncorrectWIFError(privateKeyWIF))

    const publicKeyBin = secp256k1.derivePublicKeyCompressed(privateKeyBin)
    if(typeof publicKeyBin === 'string') throw new Error(publicKeyBin)
    const publicKey = binToHex(publicKeyBin)

    const messageHash = await sha256.hash(utf8ToBin(contractAddress))
    const signatureBin = secp256k1.signMessageHashSchnorr(privateKeyBin, messageHash);
    if(typeof signatureBin === 'string') throw new Error(signatureBin)
    const signature = binToHex(signatureBin);

    return { publicKey, signature }
}




/**
 * @param {import("@generalprotocols/anyhedge").ContractDataV2} contractData 
 * @returns 
 */
export function contractDataToParameters(contractData) {
  const contractParameters = contractData.parameters
  return [
    contractParameters.shortMutualRedeemPublicKey,
    contractParameters.longMutualRedeemPublicKey,
    contractParameters.enableMutualRedemption,
    contractParameters.shortLockScript,
    contractParameters.longLockScript,
    contractParameters.oraclePublicKey,
    contractParameters.nominalUnitsXSatsPerBch,
    contractParameters.satsForNominalUnitsAtHighLiquidation,
    contractParameters.payoutSats,
    contractParameters.lowLiquidationPrice,
    contractParameters.highLiquidationPrice,
    contractParameters.startTimestamp,
    contractParameters.maturityTimestamp,
  ];
}




/**
 * @param {import("@generalprotocols/anyhedge").ContractDataV2} contractData 
 * @returns 
 */
export function getContractParamBytecodes(contractData) {
  const contractParameters = contractData.parameters
  const parameters = [
    contractParameters.shortMutualRedeemPublicKey,
    contractParameters.longMutualRedeemPublicKey,
    contractParameters.enableMutualRedemption,
    contractParameters.shortLockScript,
    contractParameters.longLockScript,
    contractParameters.oraclePublicKey,
    contractParameters.nominalUnitsXSatsPerBch,
    contractParameters.satsForNominalUnitsAtHighLiquidation,
    contractParameters.payoutSats,
    contractParameters.lowLiquidationPrice,
    contractParameters.highLiquidationPrice,
    contractParameters.startTimestamp,
    contractParameters.maturityTimestamp,
  ];
  
  const { artifact } = getArtifact({ version: contractData.version })
  const bytecodesHex = encodeParameterBytecode(artifact, parameters);
  return {
    bytecodesHex,
    shortMutualRedeemPublicKey: bytecodesHex[0],
    longMutualRedeemPublicKey: bytecodesHex[1],
    enableMutualRedemption: bytecodesHex[2],
    shortLockScript: bytecodesHex[3],
    longLockScript: bytecodesHex[4],
    oraclePublicKey: bytecodesHex[5],
    nominalUnitsXSatsPerBch: bytecodesHex[6],
    satsForNominalUnitsAtHighLiquidation: bytecodesHex[7],
    payoutSats: bytecodesHex[8],
    lowPrice: bytecodesHex[9],
    highPrice: bytecodesHex[10],
    startTs: bytecodesHex[11],
    maturityTs: bytecodesHex[12],
  }
}