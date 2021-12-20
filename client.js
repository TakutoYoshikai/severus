const fs = require("fs");
const abi = JSON.parse(fs.readFileSync(__dirname + "/abi.json", "utf8"));
const axios = require("axios");
const Contract = require("web3-eth-contract");
const Web3Utils = require("web3-utils");

class Client {
  constructor(rpcHost, accounts, contractAddress, baseUrl) {
    this.rpcHost = rpcHost;
    this.accounts = accounts;
    this.contractAddress = contractAddress;
    this.baseUrl = baseUrl;
  }
  async init() {
    Contract.setProvider(this.rpcHost);
    this.contract = new Contract(abi, this.contractAddress);
  }
  async createBackup(signed) {
    return new Promise((resolve, reject) => {
      axios.post(this.baseUrl + "/backup",
        signed,
        {
          headers: {
            "content-type": "application/json",
          }
        }
      ).then(response => {
        resolve(response.data);
      }).catch(err => {
        reject(err);
      });
    });
  }
  async getIpfsHashes(address) {
    const response = await this.contract.methods.getBackups(address).call();
    const ipfsHashes = response[0];
    const times = response[1];
    const result = [];
    for (let i = 0; i < ipfsHashes.length; i++) {
      result.push({
        ipfsHash: ipfsHashes[i],
        time: times[i],
      });
    }
    return result;
  }
  async signIpfsHash(ipfsHash, accountToSign) {
    const hash = Web3Utils.soliditySha3({
      type: "string",
      value: ipfsHash,
    });
    let signature;

    if (accountToSign.privateKey) {
      signature = await this.accounts.sign(
        hash,
        accountToSign.privateKey,
      ).signature;
    } else if (accountToSign.address) {
      signature = await this.web3.eth.personal.sign(
        hash,
        accountToSign.address,
      );
    } else {
      throw new Error("It needs an account to sign.");
    }
    return {
      signature,
      ipfsHash,
    }
  }
}

module.exports = Client;
