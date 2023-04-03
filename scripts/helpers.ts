import 'dotenv/config'

import {
  readFileSync,
  writeFileSync,
} from 'fs'
import path from 'path'
import { CustomError } from 'ts-custom-error'
import fs from 'fs'
import https from 'https'

import {
  AccountData,
  DirectSecp256k1HdWallet,
  EncodeObject
} from '@cosmjs/proto-signing'
import { getSigningCosmWasmClient } from '@sei-js/core'
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import {calculateFee, GasPrice, isDeliverTxFailure} from '@cosmjs/stargate'

export const ARTIFACTS_PATH = '../artifacts'

export interface Wallet {
  account: AccountData
  chainId: string
  client: SigningCosmWasmClient
  gasPrice: GasPrice
}
export class TransactionError extends CustomError {
  public constructor(
    public code: string | number,
    public transactionHash: string | undefined,
    public rawLog: string | undefined,
  ) {
    super("transaction failed")
  }
}

export function getRemoteFile(file: any, url: any) {
  const localFile = fs.createWriteStream(path.join(ARTIFACTS_PATH, `${file}.json`));

  https.get(url, (res) => {
    res.pipe(localFile);
    res.on("finish", () => {
      file.close();
    })
  }).on('error', (e) => {
    console.error(e);
  });
}

export function readArtifact(name: string = 'artifact', from: string = ARTIFACTS_PATH) {
  try {
    const data = readFileSync(path.join(from, `${name}.json`), 'utf8')
    return JSON.parse(data)
  } catch (e) {
    return {}
  }
}

export async function newWallet(): Promise<Wallet> {
  if (!process.env.MNEMONIC) {
    throw new Error('Set the MNEMONIC env variable to the mnemonic of the wallet to use')
  }

  if (!process.env.GAS_PRICE) {
    throw new Error('Set the GAS_PRICE env variable to the gas price to use when creating client')
  }

  if (!process.env.RPC_URL) {
    throw new Error('Set the RPC_URL env variable to the RPC URL of the node to use')
  }

  const signer = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC, {
    prefix: 'sei'
  })

  const accounts = await signer.getAccounts()
  if (accounts.length === 0) {
    throw new Error('No accounts found in wallet')
  }

  if (accounts.length > 1) {
    throw new Error('Multiple accounts found in wallet. Not sure which to use')
  }

  const account = accounts[0]
  const gasPrice = GasPrice.fromString(process.env.GAS_PRICE)

  const client = await getSigningCosmWasmClient(process.env.RPC_URL, signer, {
    gasPrice: gasPrice
  })
  const chainId = await client.getChainId()

  if (chainId !== process.env.CHAIN_ID) {
    throw new Error(`Chain ID mismatch. Expected ${process.env.CHAIN_ID}, got ${chainId}`)
  }

  return { account, chainId, client, gasPrice }
}

export function writeArtifact(data: object, name: string = 'artifact', to: string = ARTIFACTS_PATH) {
  writeFileSync(path.join(to, `${name}.json`), JSON.stringify(data, null, 2))
}

// Tequila lcd is load balanced, so txs can't be sent too fast, otherwise account sequence queries
// may resolve an older state depending on which lcd you end up with. Generally 1000 ms is enough
// for all nodes to sync up.
let TIMEOUT = 1000

export function setTimeoutDuration(t: number) {
  TIMEOUT = t
}

export function getTimeoutDuration() {
  return TIMEOUT
}

export async function sleep(timeout: number) {
  await new Promise(resolve => setTimeout(resolve, timeout))
}

export async function performTransaction(wallet: Wallet, msg: EncodeObject) {
  const result = await wallet.client.signAndBroadcast(wallet.account.address, [msg], calculateFee(4000000, wallet.gasPrice))
  if (isDeliverTxFailure(result)) {
    throw new TransactionError(result.code, result.transactionHash, result.rawLog)
  }
  return result
}

export async function uploadContract(wallet: Wallet, filepath: string) {
  const contract = readFileSync(filepath)
  const result = await wallet.client.upload(wallet.account.address, contract, calculateFee(4000000, wallet.gasPrice))
  return result.codeId
}
//
export async function instantiateContract(wallet: Wallet, admin_address: string | undefined, codeId: number, msg: object, label: string) {
  const result = await wallet.client.instantiate(wallet.account.address, codeId, msg, label, calculateFee(4000000, wallet.gasPrice), {
    admin: admin_address
  })
  return result.logs[0].events.filter(el => el.type == 'instantiate').map(x => x.attributes.filter(element => element.key == '_contract_address').map(x => x.value));
}
//
// export async function executeContract(terra: LCDClient, wallet: Wallet, contractAddress: string, msg: object, coins?: Coins.Input) {
//     const executeMsg = new MsgExecuteContract(wallet.key.accAddress, contractAddress, msg, coins);
//     return await performTransaction(terra, wallet, executeMsg);
// }
//
export async function queryContract(wallet: Wallet, contractAddress: string, query: object): Promise<any> {
  return await wallet.client.queryContractSmart(contractAddress, query)
}
//
// export async function queryContractInfo(terra: LCDClient, contractAddress: string): Promise<any> {
//     return await terra.wasm.contractInfo(contractAddress)
// }
//
// export async function queryCodeInfo(terra: LCDClient, codeID: number): Promise<any> {
//     return await terra.wasm.codeInfo(codeID)
// }
//
export async function deployContract(wallet: Wallet, admin_address: string, filepath: string, initMsg: object, label: string) {
  const codeId = await uploadContract(wallet, filepath);
  return await instantiateContract(wallet, admin_address, codeId, initMsg, label);
}
//
// export async function migrate(terra: LCDClient, wallet: Wallet, contractAddress: string, newCodeId: number, msg: object) {
//     const migrateMsg = new MsgMigrateContract(wallet.key.accAddress, contractAddress, newCodeId, msg);
//     return await performTransaction(terra, wallet, migrateMsg);
// }
//
// export async function update_contract_admin(
//     terra: LCDClient,
//     wallet: Wallet,
//     contract_address: string,
//     admin_address: string
// ) {
//     let msg = new MsgUpdateContractAdmin(
//         wallet.key.accAddress,
//         admin_address,
//         contract_address
//     );
//
//     return await performTransaction(terra, wallet, msg);
// }
//
// export function initialize(terra: LCDClient) {
//     const mk = new MnemonicKey();
//
//     console.log(`Account Address: ${mk.accAddress}`);
//     console.log(`MnemonicKey: ${mk.mnemonic}`);
//
//     return terra.wallet(mk);
// }
//
// export function toEncodedBinary(object: any) {
//     return Buffer.from(JSON.stringify(object)).toString('base64');
// }
//
// export function strToEncodedBinary(data: string) {
//     return Buffer.from(data).toString('base64');
// }
//
// export function toDecodedBinary(data: string) {
//     return Buffer.from(data, 'base64')
// }
//
// export class NativeAsset {
//     denom: string;
//     amount?: string
//
//     constructor(denom: string, amount?: string) {
//         this.denom = denom
//         this.amount = amount
//     }
//
//     getInfo() {
//         return {
//             "native_token": {
//                 "denom": this.denom,
//             }
//         }
//     }
//
//     withAmount() {
//         return {
//             "info": this.getInfo(),
//             "amount": this.amount
//         }
//     }
//
//     getDenom() {
//         return this.denom
//     }
//
//     toCoin() {
//         return new Coin(this.denom, this.amount || "0")
//     }
// }
//
// export class TokenAsset {
//     addr: string;
//     amount?: string
//
//     constructor(addr: string, amount?: string) {
//         this.addr = addr
//         this.amount = amount
//     }
//
//     getInfo() {
//         return {
//             "token": {
//                 "contract_addr": this.addr
//             }
//         }
//     }
//
//     withAmount() {
//         return {
//             "info": this.getInfo(),
//             "amount": this.amount
//         }
//     }
//
//     toCoin() {
//         return null
//     }
//
//     getDenom() {
//         return this.addr
//     }
// }
//
// export class NativeSwap {
//     offer_denom: string;
//     ask_denom: string;
//
//     constructor(offer_denom: string, ask_denom: string) {
//         this.offer_denom = offer_denom
//         this.ask_denom = ask_denom
//     }
//
//     getInfo() {
//         return {
//             "native_swap": {
//                 "offer_denom": this.offer_denom,
//                 "ask_denom": this.ask_denom
//             }
//         }
//     }
// }
//
// export class AstroSwap {
//     offer_asset_info: TokenAsset | NativeAsset;
//     ask_asset_info: TokenAsset | NativeAsset;
//
//     constructor(offer_asset_info: TokenAsset | NativeAsset, ask_asset_info: TokenAsset | NativeAsset) {
//         this.offer_asset_info = offer_asset_info
//         this.ask_asset_info = ask_asset_info
//     }
//
//     getInfo() {
//         return {
//             "astro_swap": {
//                 "offer_asset_info": this.offer_asset_info.getInfo(),
//                 "ask_asset_info": this.ask_asset_info.getInfo(),
//             }
//         }
//     }
// }
//
// export function checkParams(network: any, required_params: any) {
//     for (const k in required_params) {
//         if (!network[required_params[k]]) {
//             throw "Set required param: " + required_params[k]
//         }
//     }
// }
