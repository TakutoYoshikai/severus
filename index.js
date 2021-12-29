#!/usr/bin/env node

const { share, backup, restore } = require("severus-lib");

const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const fs = require("fs");
const path = require("path");
const silverKeyPath = path.join(userHome, ".silver", "secret", "private-key.txt");
const mkdirp = require("mkdirp");

const { allFiles, randomString } = require("./util");

const { ArgumentParser } = require("argparse");


async function main() {
  const parser = new ArgumentParser({
    description: "severus is a tool for encryption data and saving the encrypted data into P2P network. severus uses Polygon Mumbai Network."
  });

  parser.add_argument("mode", { help: "save | share | restore | init" });
  parser.add_argument("-d", "--dir", { help: "directory to save" });

  const args = parser.parse_args();
  if (args.mode === "restore") {
    const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    const files = await restore(silverKey);
    for (const file of files) {
      const p = path.resolve(path.join(process.cwd(), file.name));
      if (!p.startsWith(process.cwd())) {
        continue;
      }
      fs.writeFileSync(p, file.content);
    }
  } else if (args.mode === "save") {
    const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    if (process.argv.length < 4) {
      return;
    }
    const dirPath = args.dir;
    const filePaths = allFiles(dirPath);
    const files = filePaths.map(filePath => {
      const content = fs.readFileSync(filePath);
      return {
        name: filePath,
        content,
      }
    });
    await backup(files, silverKey);
  } else if (args.mode === "init") {
    const silverSecretDir = path.join(userHome, ".silver", "secret");
    mkdirp(silverSecretDir);
    if (!fs.existsSync(silverKeyPath)) {
      fs.writeFileSync(silverKeyPath, randomString());
    }
  } else if (args.mode === "share") {
    const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    if (process.argv.length < 4) {
      return;
    }
    const dirPath = args.dir;
    const filePaths = allFiles(dirPath);
    const files = filePaths.map(filePath => {
      const content = fs.readFileSync(filePath);
      return {
        name: filePath,
        content,
      }
    });
    await share(files, silverKey);
  }
}

if (require.main === module) {
  main();
}
