import { binToHex } from "@bitauth/libauth";
import { asmToScript, generateRedeemScript, placeholder, scriptToBytecode } from "@cashscript/utils";
import { SignatureTemplate } from "cashscript";
import { encodeConstructorArguments } from "cashscript/dist/Argument.js";
import { createInputScript, getInputSize } from "cashscript/dist/utils.js";

/**
 * @param {import("cashscript").Artifact} artifact
 * @param {any[]} parameters
 */
export function encodeParameterBytecode(artifact, parameters) {
  const encodedArgs = encodeConstructorArguments(artifact, parameters).slice();
  const argsScript = generateRedeemScript(new Uint8Array(), encodedArgs);
  const bytecodesHex = argsScript.map(script => {
    return binToHex(scriptToBytecode([script]))
  })

  return bytecodesHex
}

export function baseBytecodeToHex(bytecode) {
  const script = asmToScript(bytecode)
  const baseScript = generateRedeemScript(script, new Uint8Array())  
  const baseBytecode = scriptToBytecode(baseScript)
  return binToHex(baseBytecode)
}


/**
 * Taken directly from Transaction class' fee calculation
 * Returns the bytesize of contract's transaction input
 * @param {import("cashscript").Transaction} transaction
 */
export function getPlaceholderScript(transaction) {
  const placeholderArgs = transaction.encodedFunctionArgs.map((arg) => (arg instanceof SignatureTemplate ? placeholder(71) : arg));

  // Create a placeholder preimage of the correct size
  // const placeholderPreimage = transaction.abiFunction.covenant
  //     ? placeholder(getPreimageSize(scriptToBytecode(transaction.contract.redeemScript)))
  //     : undefined;

  // Create a placeholder input script for size calculation using the placeholder
  // arguments and correctly sized placeholder preimage
  const placeholderScript = createInputScript(transaction.contract.redeemScript, placeholderArgs, transaction.selector);
  return placeholderScript
}

/**
 * Taken directly from Transaction class' fee calculation
 * Returns the bytesize of contract's transaction input
 * @param {import("cashscript").Transaction} transaction
 */
export function calculateInputSize(transaction) {
  const placeholderScript = getPlaceholderScript(transaction)
  const contractInputSize = getInputSize(placeholderScript);
  return contractInputSize
}
