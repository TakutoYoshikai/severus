#!/usr/bin/env node

const { addBackup, getBackups, share, backup, restore } = require("severus-lib");

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

  parser.add_argument("mode", { help: "save | share | restore | init | list" });
  parser.add_argument("-d", "--dir", { help: "directory to save" });
  parser.add_argument("-n", "--name", { help: "directory name" });

  const args = parser.parse_args();
  if (args.mode === "restore") {
    if (!args.name) {
      console.error("restore command needs name argument.");
      return;
    }
    let silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    if (args.name) {
      silverKey += args.name;
    }
    const files = await restore(silverKey);
    for (const file of files) {
      const p = path.resolve(path.join(process.cwd(), file.name));
      if (!p.startsWith(process.cwd())) {
        continue;
      }
      fs.writeFileSync(p, file.content);
    }
  } else if (args.mode === "save") {
    if (!args.name) {
      console.error("save command needs name argument.");
      return;
    }
    let silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    const dirPath = args.dir;
    const filePaths = allFiles(dirPath);
    const files = filePaths.map(filePath => {
      const content = fs.readFileSync(filePath);
      return {
        name: filePath,
        content,
      }
    });
    try {
      await backup(files, silverKey + args.name);
    } catch(err) {
      console.error("Failed to register the data.");
    }
    try {
      await addBackup(args.name, silverKey);
    } catch(err) {
      console.error("Failed to update backup list.");
    }
  } else if (args.mode === "init") {
    const silverSecretDir = path.join(userHome, ".silver", "secret");
    mkdirp(silverSecretDir);
    if (!fs.existsSync(silverKeyPath)) {
      fs.writeFileSync(silverKeyPath, randomString());
    }
  } else if (args.mode === "list") {
    const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    const list = await getBackups(silverKey);
    for (const d of list) {
      console.log(d);
    }
  } else if (args.mode === "share") {
    if (args.name) {
      console.error("name arg is not able to use with share.");
      return;
    }
    const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    const dirPath = args.dir;
    const filePaths = allFiles(dirPath);
    const files = filePaths.map(filePath => {
      const content = fs.readFileSync(filePath);
      return {
        name: filePath,
        content,
      }
    });
    try {
      await share(files, silverKey);
    } catch(err) {
      console.error("Failed to register the data.");
    }
  }
}

if (require.main === module) {
  main();
}
