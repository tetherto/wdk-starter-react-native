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
  // Worklet modules: long-lived services that run next to the wallets inside
  // the worklet. The app talks to them with useModule('<name>'); their runtime
  // config (project ID, storage path) comes from wdkConfigs.modules in
  // src/wdk/networks.ts. See docs/WALLETCONNECT.md.
  modules: {
    walletconnect: {
      package: 'wdk-module-walletconnect'
    }
  },
  // The only module methods the app may call over IPC. Not enforced yet: the
  // worklet runtime this app resolves (@tetherto/pear-wrk-wdk 1.0.0-beta.10,
  // via wdk-react-native-core) ignores this list. It takes effect once that
  // dependency moves to a version that reads it.
  allowedModuleMethods: {
    walletconnect: {
      methods: [
        'pair',
        'approveSession',
        'rejectSession',
        'respondRequest',
        'rejectRequest',
        'disconnect',
        'getSessions',
        'getPendingProposals',
        'getPendingRequests'
      ]
    }
  },
  preloadModules: [
    '@buildonspark/spark-frost-bare-addon'
  ]
}
