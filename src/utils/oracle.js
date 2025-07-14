import axios from 'axios';
import { hexToBin } from '@bitauth/libauth';
import { OracleNetwork, OracleData } from '@generalprotocols/price-oracle'

/**
 * @param {Object} opts
 * @param {String} opts.pubkey
 * @param {Object} opts.requestParams
 * @param {Object} opts.oracleRelay
 * @param {String} opts.oracleRelay.scheme
 * @param {String} opts.oracleRelay.host
 * @param {Number} opts.oracleRelay.port
 */
export async function getOraclePrices(opts) {
  const { pubkey, oracleRelay } = opts;

  const defaultSearchRequest = { publicKey: pubkey, count: 1, minDataSequence: 1 }
  const searchRequest = Object.assign({}, defaultSearchRequest, opts?.requestParams)

  const params = Object.assign({}, searchRequest, { publicKey: pubkey })
  const resp = await axios.get(`https://${oracleRelay.host}/api/v1/oracleMessages`, { params })
	const requestedMessages = resp.data?.oracleMessages
	
  const parsedMessages = await Promise.all(
		requestedMessages.map(async (priceMessage) => {
			const { message, signature, publicKey } = priceMessage
			const parseOracleMessageResponse = await parseOracleMessage(message, publicKey, signature)
			if (!parseOracleMessageResponse.success) return parseOracleMessageResponse.error
			const priceData = parseOracleMessageResponse.priceData
			return { priceMessage, priceData }
		})
	)

  return parsedMessages
}


/**
 * 
 * @param {String} message 
 * @param {String} [publicKey]
 * @param {String} [signature]
 */
export async function parseOracleMessage(message, publicKey, signature) {
	const response = { success: false, priceData: {}, error: null }
	try {
		if (publicKey && signature) {
			const validMessageSignature = await OracleData.verifyMessageSignature(hexToBin(message), hexToBin(signature), hexToBin(publicKey));
			if (!validMessageSignature) throw new Error('Oracle message invalid')
		}
		response.priceData = await OracleData.parsePriceMessage(hexToBin(message))
		if (publicKey) response.priceData.oraclePubKey = publicKey
		response.success = true
		return response
	} catch(error) {
		if (typeof error === 'string') response.error = error
		else if (error?.message) response.error = error.message
		response.success = false
	}
	return response
}
