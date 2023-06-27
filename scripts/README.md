## Sparrowswap Core Scripts

### Deploy on `testnet`

Set multisig address in corresponding config or create new one in chain_configs

Build contract:
```shell
yarn build-release
```

Create `.env`:
```shell
MNEMONIC="..."
RPC_URL=https://rpc.atlantic-2.seinetwork.io/
CHAIN_ID=atlantic-2
GAS_PRICE=0.0025usei
```

Deploy the contracts:
```shell
yarn build-app
```
