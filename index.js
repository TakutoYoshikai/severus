#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const SILVER_PATH = path.join(userHome, ".silver");
const SILVER_CACHE_PATH = path.join(SILVER_PATH, "cache");
const SILVER_SECRET_PATH = path.join(SILVER_PATH, "secret");
const SILVER_KEY_PATH = path.join(SILVER_SECRET_PATH, "private-key.txt");

const contractAddress = "0x799358B503325af18FCBF9DE723393Ce76B1bfAF";
const baseUrl = "http://localhost:3000";
const rpcHost = "https://matic-mumbai.chainstacklabs.com";

const mkdirp = require("mkdirp");
const crypto = require("crypto");
const fsExtra = require("fs-extra");
const Client = require("./client");
const execSync = require("child_process").execSync;
const NodeRSA = require("node-rsa");
const SeededRSA = require("seededrsa");
const Accounts = require("web3-eth-accounts");
const accounts = new Accounts(rpcHost);

const IpfsHttpClient = require("ipfs-http-client");
const ipfsClient = IpfsHttpClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

function generateRandomString(length) {
  return crypto.randomBytes(length).reduce((p, i) => p + (i % 36).toString(36), '')
}

async function createSilverDir() {
  await mkdirp(SILVER_PATH);
  await mkdirp(SILVER_CACHE_PATH);
  await mkdirp(SILVER_SECRET_PATH);
}

function createSilverKey() {
  const len = 512;
  const silverKey = generateRandomString(len);
  fs.writeFileSync(SILVER_KEY_PATH, silverKey);
}

function getSilverKey() {
  return fs.readFileSync(SILVER_KEY_PATH, "utf8").trim() + contractAddress;
}
function getPolygonPrivateKey() {
  const silverKey = getSilverKey();
  const hashHex = crypto.createHash("sha256").update(silverKey, "utf8").digest("hex");
  return hashHex;
}
function readdirRecursively (dir, files = []) {
  const paths = fs.readdirSync(dir);
  const dirs = [];
  for (const _path of paths) {
    const stats = fs.statSync(path.join(dir, _path));
    if (stats.isDirectory()) {
      dirs.push(path.join(dir, _path));
    } else {
      files.push(path.join(dir, _path));
    }
  }
  for (const d of dirs) {
    files = readdirRecursively(d, files);
  }
  const resolvedDir = path.resolve(dir);
  return files;
};

async function fetchFile(ipfsHash, outputFile) {
  const response = await ipfsClient.get(ipfsHash);
  for await (const data of response) {
    let content = Buffer.alloc(0);
    for await (const chunk of data.content) {
      content = Buffer.concat([content, chunk]);
    }
    fs.writeFileSync(outputFile, content);
  }
}

async function uploadFile(targetFile) {
  const buf = fs.readFileSync(targetFile);
  const response = await ipfsClient.add(buf);
  if (response) {
    return response.path;
  }
  throw new Error("Failed to upload the file.");
}

function encrypt(targetFilePath, outputCacheDirPath, output) {
  const encryptedDirPath = path.join(SILVER_CACHE_PATH, outputCacheDirPath, "encrypted");
  if (!output) {
    output = path.join(encryptedDirPath, targetFilePath);
  }
  const data = fs.readFileSync(targetFilePath);
  const silverKey = getSilverKey();
  const salt = crypto.randomBytes(16).toString("base64");
  const key = crypto.scryptSync(silverKey, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encryptedData = cipher.update(data);
  encryptedData = Buffer.concat([iv, Buffer.from(salt), encryptedData, cipher.final()]);
  fs.writeFileSync(output, encryptedData);
}

async function decrypt(targetFilePath, ipfsHash, outputFilePath) {
  let output = path.join(SILVER_CACHE_PATH, ipfsHash, "decrypted", targetFilePath);
  if (outputFilePath) {
    output = outputFilePath;
  }
  await mkdirp(path.dirname(output));
  const silverKey = getSilverKey();
  
  let encryptedData = fs.readFileSync(targetFilePath);
  const iv = encryptedData.slice(0, 16);
  const salt = encryptedData.slice(16, 16 + 24);
  encryptedData = encryptedData.slice(16 + 24);
  const key = crypto.scryptSync(silverKey, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decryptedData = decipher.update(encryptedData);
  decryptedData = Buffer.concat([decryptedData, decipher.final()]);
  fs.writeFileSync(output, decryptedData);
}

function allFiles(dirPath) {
  if (dirPath.endsWith("/")) {
    dirPath = dirPath.slice(0, -1);
  }
  const resolvedDirPath = path.resolve(dirPath);
  return readdirRecursively(dirPath).map(file => {
    if (file.startsWith(resolvedDirPath)) {
      return "." + file.slice(resolvedDirPath.length);
    }
    return file;
  });
}

function createRandomDirId() {
  return crypto.createHash("sha256").update(generateRandomString(32), "utf8").digest("hex").slice(0, 32);
}

async function backupDir(targetDirPath) {
  const dirId = createRandomDirId();
  const files = allFiles(targetDirPath);
  let backupListText = "";
  for (const filePath of files) {
    const encryptedFilePath = path.join(SILVER_CACHE_PATH, dirId, "encrypted", filePath);
    await mkdirp(path.dirname(encryptedFilePath));
    encrypt(filePath, dirId);
    const ipfsHash = await uploadFile(encryptedFilePath);
    backupListText += ipfsHash + " " + filePath + "\n";
  }
  if (backupListText.endsWith("\n")) {
    backupListText = backupListText.slice(0, -1);
  }
  const backupListPath = path.join(SILVER_CACHE_PATH, dirId, "backup.lst");
  fs.writeFileSync(backupListPath, backupListText);
  const encryptedBackupListPath = path.join(SILVER_CACHE_PATH, dirId, "backup.lst.enc");
  encrypt(backupListPath, dirId, encryptedBackupListPath);
  const ipfsHash = await uploadFile(encryptedBackupListPath);
  const dirToRemove = path.join(SILVER_CACHE_PATH, dirId);
  fsExtra.removeSync(dirToRemove);
  return ipfsHash;
}

function parseBackupList(backupListPath) {
  const backupList = fs.readFileSync(backupListPath, "utf8").split("\n").map(line => {
    const words = line.split(" ");
    const ipfsHash = words[0];
    const fileName = words.slice(1).join(" ");
    return {
      ipfsHash,
      fileName,
    }
  });
  return backupList;
}

async function restore(ipfsHash) {
  const encryptedBackupListPath = path.join(SILVER_CACHE_PATH, ipfsHash, "backup.lst.enc");
  const backupListPath = path.join(SILVER_CACHE_PATH, ipfsHash, "backup.lst");
  mkdirp(path.dirname(encryptedBackupListPath));
  await fetchFile(ipfsHash, encryptedBackupListPath);
  await decrypt(encryptedBackupListPath, ipfsHash, backupListPath);
  const backupList = parseBackupList(backupListPath);
  for (const file of backupList) {
    const filePathForFetching = path.join(SILVER_CACHE_PATH, file.ipfsHash, "fetch", file.fileName);
    if (!path.resolve(filePathForFetching).startsWith(path.join(SILVER_CACHE_PATH, file.ipfsHash, "fetch"))) {
      continue;
    }
    mkdirp(path.dirname(filePathForFetching));
    await fetchFile(file.ipfsHash, filePathForFetching);
    await decrypt(filePathForFetching, file.ipfsHash, file.fileName);
    const dirToRemove = path.join(SILVER_CACHE_PATH, file.ipfsHash);
    fsExtra.removeSync(dirToRemove);
  }
  const dirToRemove = path.join(SILVER_CACHE_PATH, ipfsHash);
  fsExtra.removeSync(dirToRemove);
}

async function polygonSave(ipfsHash, privateKey) {
  const client = new Client(rpcHost, accounts, contractAddress, baseUrl);
  await client.init();
  const signed = await client.signIpfsHash(ipfsHash, {
    privateKey,
  });
  await client.createBackup(signed);
}

function privateKeyToAddress(privateKey) {
  return accounts.privateKeyToAccount(privateKey).address;
}

async function polygonGet(privateKey) {
  const address = privateKeyToAddress(privateKey);
  const baseUrl = "http://localhost:3000";

  const client = new Client(rpcHost, accounts, contractAddress, baseUrl);
  await client.init();
  const ipfsHashes = await client.getIpfsHashes(address);
  return ipfsHashes[ipfsHashes.length - 1].ipfsHash;
}

async function getRSAPrivateKey(seed) {
  const seededKey = new SeededRSA(seed);
  const key = await seededKey.generate(2048);
  return new NodeRSA(key.privateKey);
}

async function main() {
  const mode = process.argv[2];
  if (mode === "save") {
    const targetDirPath = process.argv[3];
    const ipfsHash = await backupDir(targetDirPath);
    const privateKey = getPolygonPrivateKey();
    await polygonSave(ipfsHash, privateKey);
  } else if (mode === "restore") {
    const privateKey = getPolygonPrivateKey();
    const ipfsHash = await polygonGet(privateKey);
    await restore(ipfsHash);
  } else if (mode === "init") {
    if (fs.existsSync(SILVER_KEY_PATH)) {
      return;
    }
    await createSilverDir();
    createSilverKey();
  }
}
if (require.main === module) {
  main();
} else {
  const Writer = require("./write");
  const app = require("./server");
  module.exports = {
    createSilverKey,
    getSilverKey,
    getPolygonPrivateKey,
    fetchFile,
    uploadFile,
    encrypt,
    decrypt,
    backupDir,
    parseBackupList,
    restore,
    polygonSave,
    polygonGet,
    Client,
    Writer,
    app,
  }
}

