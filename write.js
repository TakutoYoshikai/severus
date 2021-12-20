#!/usr/bin/env node

const fs = require("fs");
const abi = JSON.parse(fs.readFileSync(__dirname + "/abi.json", "utf8"));
const EthereumTx = require("ethereumjs-tx").Transaction;
const Web3 = require("web3");
const Contract = require("web3-eth-contract");
const utils = require("web3-utils");

class Writer {
  constructor(rpcHost, contractAddress, privateKey, common) {
    this.rpcHost = rpcHost;
    this.web3 = new Web3(new Web3.providers.HttpProvider(rpcHost));
    this.contractAddress = contractAddress;
    this.privateKey = privateKey;
    this.common = common;
  }

  async init() {
    Contract.setProvider(this.rpcHost);
    this.contract = new Contract(abi, this.contractAddress);
  }

  async write(data, gasEstimate, writerAddress) {
    const nonce = await this.web3.eth.getTransactionCount(
      writerAddress,
      "pending",
    );

    const gasPrice = await this.web3.eth.getGasPrice();
    const details = {
      nonce: utils.toHex(nonce),
      gasPrice: utils.toHex(gasPrice),
      gasLimit: utils.toHex(gasEstimate),
      to: this.contractAddress,
      from: writerAddress,
      data,
    };

    const transaction = await new EthereumTx(details, { common: this.common });
    transaction.sign(Buffer.from(this.privateKey, "hex"));
    const rawData = "0x" + transaction.serialize().toString("hex");
    const receipt = await this.web3.eth.sendSignedTransaction(rawData);
    return receipt.transactionHash;
  }
  async createBackup(writerAddress, signedIpfsHash) {
    const data = this.contract.methods.setBackup(
      signedIpfsHash.ipfsHash, 
      signedIpfsHash.signature
    ).encodeABI();

    const gasEstimate = await this.contract.methods
    .setBackup(
      signedIpfsHash.ipfsHash, 
      signedIpfsHash.signature
    ).estimateGas({
      from: writerAddress,
    });
    return await this.write(data, gasEstimate, writerAddress);
  }
}

module.exports = Writer;
