import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as path from 'path';
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load environment variables from root .env

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api", // Hedera Testnet JSON-RPC Relay
      accounts: [process.env.HEDERA_OPERATOR_KEY!], // Operator private key
    },
  },
};

export default config;
