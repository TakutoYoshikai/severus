#!/usr/bin/env node

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Writer = require("./write");
const fs = require("fs");
const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const Common = require("ethereumjs-common").default;
const Accounts = require("web3-eth-accounts");
const accounts = new Accounts(config.rpcHost);


const common = Common.forCustomChain(
  "mainnet",
  {
    name: "customchain",
    chainId: 80001,
  },
  "petersburg"
);
const writer = new Writer(config.rpcHost, config.contractAddress, config.privateKey, common);

writer.init();
const writerAccount = accounts.privateKeyToAccount(config.privateKey);

app.use(bodyParser.json());

app.post("/backup", (req, res) => {
  const body = req.body;
  writer.createBackup(writerAccount.address, body).then(() => {
    console.log("success");
    res.status(201).json({
      message: "Successfully posted the backup.",
    });
  }).catch(err => {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  });
});


if (require.main === module) {
  app.listen(config.port);
} else {
  module.exports = app;
}
