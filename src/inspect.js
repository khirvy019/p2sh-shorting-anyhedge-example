import 'dotenv/config';
import { pubkeyToAddress } from "./utils/crypto.js";
import { createTreasuryContract } from "./utils/factory.js";

const OWNER_WIF = process.env.OWNER_WIF;

const { contract, oraclePubkey, anyhedgeBaseBytecode, anyhedgeVersion, pubkey: ownerPubkey } = createTreasuryContract({ ownerWif: OWNER_WIF });

console.log('OWNER DATA |', {
  wif: OWNER_WIF,
  pubkey: ownerPubkey,
  address: pubkeyToAddress(ownerPubkey),
})

console.log('TREASURY CONTRACT DATA |', {
  address: contract.address,
  parameters: {
    ownerPubkey,
    oraclePubkey,
    anyhedgeBaseBytecode,
    anyhedgeVersion,
  },
})
