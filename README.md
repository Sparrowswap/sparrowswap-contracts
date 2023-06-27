# Sparrowswap Contracts

Forked from [`astroport-core`](https://github.com/astroport-fi/astroport-core/) at commit [`77cad13c6d2c86cbe034137a5ec78d667f9e5ecb`](https://github.com/astroport-fi/astroport-core/tree/77cad13c6d2c86cbe034137a5ec78d667f9e5ecb) on `03/28/2023`.

Audit report: [Oak - Astroport Core Updates v1.0](./audits/oak-astroport-core-updates-v1.0.pdf)

Constant product and stableswap automated market-maker (AMM) protocol powered by smart contracts on the [Sei](https://sei.io) network.

## Contracts diagram

![contract diagram](./assets/sc_diagram.png "Contracts Diagram")

## General Contracts

| Name                                                       | Description                                  |
| ---------------------------------------------------------- | -------------------------------------------- |
| [`factory`](contracts/factory)                             | Pool creation factory                        |
| [`pair`](contracts/pair)                                   | Pair with x*y=k curve                        |
| [`pair_stable`](contracts/pair_stable)                     | Pair with stableswap invariant curve         |
| [`router`](contracts/router)                               | Multi-hop trade router                       |
| [`token`](contracts/token)                                 | CW20 (ERC20 equivalent) token implementation |
| [`oracle`](contracts/periphery/oracle)                     | TWAP oracles for x*y=k pool types            |
| [`whitelist`](contracts/whitelist)                         | CW1 whitelist contract                       |

## Building Contracts

You will need Rust 1.64.0+ with wasm32-unknown-unknown target installed.

### You can compile each contract:
Go to contract directory and run 
    
```
cargo wasm
cp ../../target/wasm32-unknown-unknown/release/astroport_token.wasm .
ls -l astroport_token.wasm
sha256sum astroport_token.wasm
```

### You can run tests for all contracts
Run the following from the repository root

```
cargo test
```

### For a production-ready (compressed) build:
Run the following from the repository root

```
./scripts/build_release.sh
```

The optimized contracts are generated in the artifacts/ directory.

## Docs

Docs can be generated using `cargo doc --no-deps`
