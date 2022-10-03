#!/bin/sh
set -e

cd node_modules/hardhat-deploy
yarn
yarn add tsc --dev
yarn build
cp -r extendedArtifacts dist/
