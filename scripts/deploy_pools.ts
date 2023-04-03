import 'dotenv/config'
import {
  ARTIFACTS_PATH,
  Wallet,
  newWallet,
  writeArtifact,
  readArtifact,
  deployContract,
  executeContract,
  queryContract,
  toEncodedBinary
} from './helpers.js'
import { join } from 'path'
import { chainConfigs } from './types.d/chain_configs.js'
import util from 'util'
async function main() {
  const wallet = await newWallet()
  console.log(`chainID: ${wallet.chainId} wallet: ${wallet.account.address}`)

  const network = readArtifact(wallet.chainId)

  if (!network.tokenAddress) {
    throw new Error("Token address is not set, create RUM token first")
  }

  if (!network.factoryAddress) {
    throw new Error("Factory address is not set, deploy factory first")
  }

  await createPools(wallet)
  console.log('network:', readArtifact(wallet.chainId))
  console.log('FINISH')
}

async function uploadAndInitOracle(wallet: Wallet, pair: Pair, network: any, pool_pair_key: string) {
  const pool_oracle_key = "oracle" + pair.identifier

  if (pair.initOracle && network[pool_pair_key] && !network[pool_oracle_key]) {
    chainConfigs.oracle.admin ||= chainConfigs.generalInfo.multisig
    chainConfigs.oracle.initMsg.factory_contract ||= network.factoryAddress
    chainConfigs.oracle.initMsg.asset_infos ||= pair.assetInfos

    console.log(`Deploying oracle for ${pair.identifier}...`)
    const response = await deployContract(
      wallet,
      chainConfigs.oracle.admin,
      join(ARTIFACTS_PATH, 'astroport_oracle.wasm'),
      chainConfigs.oracle.initMsg,
      chainConfigs.oracle.label)

    network[pool_oracle_key] = response?.shift()?.shift()
    console.log(`Address of ${pair.identifier} oracle contract: ${network[pool_oracle_key]}`)
    writeArtifact(network, wallet.chainId)
  }
}

async function createPools(wallet: Wallet) {
  const network = readArtifact(wallet.chainId)
  const pairs = chainConfigs.createPairs.pairs;
  const pools: string[][] = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    const pool_pair_key = "pool" + pair.identifier
    const pool_lp_token_key = "lpToken" + pair.identifier

    // Create pool
    if (!network[pool_pair_key]) {
      console.log(`Creating pool ${pair.identifier}...`)
      let initParams = pair.initParams;
      if (initParams) {
        initParams = toEncodedBinary(initParams)
      }

      const response = await executeContract(wallet, network.factoryAddress, {
        create_pair: {
          pair_type: pair.pairType,
          asset_infos: pair.assetInfos,
          init_params: initParams
        }
      })

      network[pool_pair_key] = response.logs[0].events.filter(el => el.type == 'wasm').map(x => x.attributes.filter(el => el.key === "pair_contract_addr").map(x => x.value))[0][0]
      const pool_info = await queryContract(wallet, network[pool_pair_key], {
        pair: {}
      })

      // write liquidity token
      network[pool_lp_token_key] = pool_info.liquidity_token
      console.log(`Pair successfully created! Address: ${network[pool_pair_key]}`)
      writeArtifact(network, wallet.chainId)

      if (pair.initGenerator) {
        pools.push([pool_info.liquidity_token, pair.initGenerator.generatorAllocPoint])
      }
    }

    // Deploy oracle
    await uploadAndInitOracle(wallet, pair, network, pool_pair_key)
  }
}

await main()
