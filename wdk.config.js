/** @type {import('@tetherto/wdk-worklet-bundler').WdkBundleConfig} */
module.exports = {
  networks: {
    bitcoin: {
      package: '@tetherto/wdk-wallet-btc'
    },
    spark: {
      package: '@tetherto/wdk-wallet-spark'
    },
    // Per manager's direction (Slack): Ethereum Sepolia is the ONLY EVM
    // testnet in scope — not a separate mainnet+testnet pair. Arbitrum and
    // Polygon are MAINNET ONLY; their testnets (Arbitrum Sepolia, Polygon
    // Amoy) are explicitly out of scope. The 'ethereum' key below points at
    // Sepolia via .env — there is deliberately no separate 'sepolia' network
    // key anymore, since that would be redundant.
    ethereum: {
      package: '@tetherto/wdk-wallet-evm-7702-gasless'
    },
    arbitrum: {
      package: '@tetherto/wdk-wallet-evm-7702-gasless'
    },
    polygon: {
      package: '@tetherto/wdk-wallet-evm-7702-gasless'
    }
    // tron: still on hold — see config.ts's comment.
  },
  preloadModules: [
    '@buildonspark/spark-frost-bare-addon'
  ]
}
