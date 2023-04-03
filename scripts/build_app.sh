#!/usr/bin/env bash

set -e

projectPath=$(cd "$(dirname "${0}")" && cd ../ && pwd)

cd "$projectPath/scripts" && node --dns-result-order=ipv4first --loader ts-node/esm deploy_core.ts
#cd "$projectPath/scripts" && node --dns-result-order=ipv4first --loader ts-node/esm deploy_pools.ts
