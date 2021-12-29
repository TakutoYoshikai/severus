#!/usr/bin/env node

const { backup, restore } = require("severus-lib");

const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const fs = require("fs");
const path = require("path");
const silverKeyPath = path.join(userHome, ".silver", "secret", "private-key.txt");
const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
const mkdirp = require("mkdirp");

const { allFiles, randomString } = require("./util");


async function main() {
  if (process.argv[2] === "restore") {
    const files = await restore(silverKey);
    for (const file of files) {
      const p = path.resolve(path.join(process.cwd(), file.name));
      if (!p.startsWith(process.cwd())) {
        continue;
      }
      fs.writeFileSync(p, file.content);
    }
  } else if (process.argv[2] === "save") {
    if (process.argv.length < 4) {
      return;
    }
    const dirPath = process.argv[3];
    const filePaths = allFiles(dirPath);
    const files = filePaths.map(filePath => {
      const content = fs.readFileSync(filePath);
      return {
        name: filePath,
        content,
      }
    });
    await backup(files, silverKey);
  } else if (process.argv[2] === "init") {
    const silverSecretDir = path.join(userHome, ".silver", "secret");
    mkdirp(silverSecretDir);
    fs.writeFileSync(silverKeyPath, randomString());
  }
}

if (require.main === module) {
  main();
}
