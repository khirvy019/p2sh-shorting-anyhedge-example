import axios, { AxiosError } from "axios";
import { decodeExtendedJson, encodeExtendedJson } from '@generalprotocols/anyhedge'

export const lpAxios = axios.create({
  baseURL: 'https://liquidity.anyhedge.com',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  transformRequest: [
    function(data, /* headers */) {
      try {
        return encodeExtendedJson(data)
      } catch {
        return data
      }
    }
  ],
  transformResponse: [
    function(data, /* headers */) {
      try {
        return decodeExtendedJson(data)
      } catch {
        return data
      }
    }
  ]
});

const errorHandler = error => {
  if (error instanceof AxiosError && error.response) {
    return Promise.reject({
      status: error.response.status,
      data: error.response.data,
    });
  }
  throw error
}

export async function getLiquidityServiceInformation() {
  return lpAxios.get('/api/v2/liquidityServiceInformation/')
    .catch(errorHandler)
    .then(response => {
      return response.data
    })
    
}

/**
 * @param {Object} opts
 * @param {String} opts.oraclePublicKey
 * @param {String} opts.poolSide
*/
export async function prepareContractPosition(opts) {
  return lpAxios.post('/api/v2/prepareContractPosition/', opts)
    .catch(errorHandler)
    .then(response => {
      return response.data
    })
}

/**
 * @param {Object} opts 
 * @param {import("@generalprotocols/anyhedge").ContractCreationParameters} opts.contractCreationParameters
 * @param {Number} opts.contractStartingOracleMessageSequence
 * @returns 
 */
export async function proposeContractPosition(opts) {
  return lpAxios.post('/api/v2/proposeContract/', opts)
    .catch(errorHandler)
    .then(response => {
      return response.data
    })
}

/**
 * @param {Object} opts
 * @param {String} opts.contractData
 * @param {String} opts.outpointTransactionHash
 * @param {Number} opts.outpointIndex
 * @param {BigInt} opts.satoshis
 * @param {String} opts.takerSide
 * @param {String[]} opts.dependencyTransactions
 * @param {Number} opts.oracleMessageSequence
 * @param {String} opts.unlockingScript
 */
export async function fundContract(opts) {
  return lpAxios.post('/api/v2/fundContract/', opts)
    .catch(errorHandler)
    .then(response => {
      return response.data
    })
}


/**
 * @param {Object} opts 
 * @param {Object} opts.settlementService 
 * @param {String} opts.contractAddress 
 * @param {String} opts.signature 
 * @param {String} opts.publicKey 
 */
export async function getContractStatus(opts) {
  const settlementService = opts?.settlementService;
  const contractStatusUrl = `${settlementService?.scheme}://${settlementService?.host}/api/v2/contractStatus`;
  const headers = {
    Authorization: 'a771e75471d55b4c3b7e2c6e41080cb0d5e003fce33bdc9b9a743db0e8fbd89c',
  }
  const params = {
    contractAddress: opts?.contractAddress,
    publicKey: opts?.publicKey,
    signature: opts?.signature,
  }
  const contractStatusResponse = await axios.get(contractStatusUrl, {
    params: params,
    headers: headers,
    transformResponse: [
      function(data, /* headers */) {
        try {
          return decodeExtendedJson(data)
        } catch {
          return data
        }
      }
    ]
  }).catch(errorHandler)

  return contractStatusResponse.data
}