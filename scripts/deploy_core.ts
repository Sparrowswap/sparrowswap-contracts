import 'dotenv/config'
import {
  ARTIFACTS_PATH,
  Wallet,
  newWallet,
  writeArtifact,
  readArtifact,
  deployContract,
  queryContract,
  uploadContract,
} from './helpers.js'
import { join } from 'path'
import { chainConfigs } from './types.d/chain_configs.js'
import { strictEqual } from 'assert'

const SECONDS_IN_DAY: number = 60 * 60 * 24 // min, hour, day

async function main() {
  const wallet = await newWallet()
  console.log(`chainID: ${wallet.chainId} wallet: ${wallet.account.address}`)

  if (!chainConfigs.generalInfo.multisig) {
    throw new Error("Set the proper owner multisig for the contracts")
  }

  await uploadAndInitToken(wallet)
  // await uploadAndInitTreasury(wallet)
  await uploadPairContracts(wallet)
  // await uploadAndInitFactory(wallet)
  // await uploadAndInitRouter(wallet)
}

async function uploadAndInitToken(wallet: Wallet) {
  const network = readArtifact(wallet.chainId)

  if (!network.tokenCodeID) {
    network.tokenCodeID = await uploadContract(wallet, join(ARTIFACTS_PATH, 'astroport_token.wasm')!)
    writeArtifact(network, wallet.chainId)
    console.log(`Token codeId: ${network.tokenCodeID}`)
  }

  if (!network.tokenAddress) {
    chainConfigs.token.admin ||= chainConfigs.generalInfo.multisig
    chainConfigs.token.initMsg.marketing.marketing ||= chainConfigs.generalInfo.multisig

    for (let i = 0; i < chainConfigs.token.initMsg.initial_balances.length; i++) {
      chainConfigs.token.initMsg.initial_balances[i].address ||= chainConfigs.generalInfo.multisig
    }

    console.log('Deploying Token...')
    const response = await deployContract(
      wallet,
      chainConfigs.token.admin,
      join(ARTIFACTS_PATH, 'astroport_token.wasm'),
      chainConfigs.token.initMsg,
      chainConfigs.token.label,
    )

    network.tokenAddress = response?.shift()?.shift()
    console.log("rum:", network.tokenAddress)
    console.log(await queryContract(wallet, network.tokenAddress, { token_info: {} }))
    console.log(await queryContract(wallet, network.tokenAddress, { minter: {} }))

    for (let i = 0; i < chainConfigs.token.initMsg.initial_balances.length; i++) {
      const balance = await queryContract(wallet, network.tokenAddress, { balance: { address: chainConfigs.token.initMsg.initial_balances[i].address } })
      strictEqual(balance.balance, chainConfigs.token.initMsg.initial_balances[i].amount)
    }

    writeArtifact(network, wallet.chainId)
  }
}

async function uploadPairContracts(wallet: Wallet) {
  const network = readArtifact(wallet.chainId)

  if (!network.pairCodeID) {
    console.log('Register Pair Contract...')
    network.pairCodeID = await uploadContract(wallet, join(ARTIFACTS_PATH, 'astroport_pair.wasm')!)
    writeArtifact(network, wallet.chainId)
  }

  if (!network.pairStableCodeID) {
    console.log('Register Stable Pair Contract...')
    network.pairStableCodeID = await uploadContract(wallet, join(ARTIFACTS_PATH, 'astroport_pair_stable.wasm')!)
    writeArtifact(network, wallet.chainId)
  }
}

// async function uploadAndInitFactory(wallet: Wallet) {
//   let network = readArtifact(terra.config.chainID)
//
//   if (!network.factoryAddress) {
//     console.log('Deploying Factory...')
//     console.log(`CodeId Pair Contract: ${network.pairCodeID}`)
//     console.log(`CodeId Stable Pair Contract: ${network.pairStableCodeID}`)
//
//     for (let i = 0; i < chainConfigs.factory.initMsg.pair_configs.length; i++) {
//       if (!chainConfigs.factory.initMsg.pair_configs[i].code_id) {
//         if (JSON.stringify(chainConfigs.factory.initMsg.pair_configs[i].pair_type) === JSON.stringify({ xyk: {} })) {
//           chainConfigs.factory.initMsg.pair_configs[i].code_id ||= network.pairCodeID;
//         }
//
//         if (JSON.stringify(chainConfigs.factory.initMsg.pair_configs[i].pair_type) === JSON.stringify({ stable: {} })) {
//           chainConfigs.factory.initMsg.pair_configs[i].code_id ||= network.pairStableCodeID;
//         }
//       }
//     }
//
//     chainConfigs.factory.initMsg.token_code_id ||= network.tokenCodeID;
//     chainConfigs.factory.initMsg.whitelist_code_id ||= network.whitelistCodeID;
//     chainConfigs.factory.initMsg.owner ||= wallet.key.accAddress;
//     chainConfigs.factory.admin ||= chainConfigs.generalInfo.multisig;
//
//     let resp = await deployContract(
//       terra,
//       wallet,
//       chainConfigs.factory.admin,
//       join(ARTIFACTS_PATH, 'astroport_factory.wasm'),
//       chainConfigs.factory.initMsg,
//       chainConfigs.factory.label
//     )
//
//     // @ts-ignore
//     network.factoryAddress = resp.shift().shift()
//     console.log(`Address Factory Contract: ${network.factoryAddress}`)
//     writeArtifact(network, terra.config.chainID)
//
//     // Set new owner for factory
//     if (chainConfigs.factory.change_owner) {
//       console.log('Propose owner for factory. Ownership has to be claimed within %s days',
//         Number(chainConfigs.factory.proposeNewOwner.expires_in) / SECONDS_IN_DAY)
//       await executeContract(terra, wallet, network.factoryAddress, {
//         "propose_new_owner": chainConfigs.factory.proposeNewOwner
//       })
//     }
//   }
// }
//
// async function uploadAndInitRouter(wallet: Wallet) {
//   let network = readArtifact(terra.config.chainID)
//
//   if (!network.routerAddress) {
//     chainConfigs.router.initMsg.astroport_factory ||= network.factoryAddress
//     chainConfigs.router.admin ||= chainConfigs.generalInfo.multisig;
//
//     console.log('Deploying Router...')
//     let resp = await deployContract(
//       terra,
//       wallet,
//       chainConfigs.router.admin,
//       join(ARTIFACTS_PATH, 'astroport_router.wasm'),
//       chainConfigs.router.initMsg,
//       chainConfigs.router.label
//     )
//
//     // @ts-ignore
//     network.routerAddress = resp.shift().shift()
//     console.log(`Address Router Contract: ${network.routerAddress}`)
//     writeArtifact(network, terra.config.chainID)
//   }
// }
// //
// async function uploadAndInitTreasury(wallet: Wallet) {
//   let network = readArtifact(terra.config.chainID)
//
//   if (!network.whitelistCodeID) {
//     console.log('Register Treasury Contract...')
//     network.whitelistCodeID = await uploadContract(terra, wallet, join(ARTIFACTS_PATH, 'astroport_whitelist.wasm')!)
//     writeArtifact(network, terra.config.chainID)
//   }
//
//   if (!network.treasuryAddress) {
//     chainConfigs.treasury.admin ||= chainConfigs.generalInfo.multisig;
//     chainConfigs.treasury.initMsg.admins[0] ||= chainConfigs.generalInfo.multisig;
//
//     console.log('Instantiate the Treasury...')
//     let resp = await instantiateContract(
//       terra,
//       wallet,
//       chainConfigs.treasury.admin,
//       network.whitelistCodeID,
//       chainConfigs.treasury.initMsg,
//       chainConfigs.treasury.label,
//     );
//
//     // @ts-ignore
//     network.treasuryAddress = resp.shift().shift()
//     console.log(`Treasury Contract Address: ${network.treasuryAddress}`)
//     writeArtifact(network, terra.config.chainID)
//   }
// }

await main()
