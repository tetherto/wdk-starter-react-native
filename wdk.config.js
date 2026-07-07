/** @type {import('@tetherto/wdk-worklet-bundler').WdkBundleConfig} */
module.exports = {
  networks: {
    bitcoin: {
      package: '@tetherto/wdk-wallet-btc'
    },
    spark: {
      package: '@tetherto/wdk-wallet-spark'
    },
    ethereum: {
      package: '@tetherto/wdk-wallet-evm-erc-4337'
    },
    tron: {
      package: '@tetherto/wdk-wallet-tron-gasfree'
    }
  },
  preloadModules: [
    '@buildonspark/spark-frost-bare-addon'
  ]
}