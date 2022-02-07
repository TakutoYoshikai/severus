#!/usr/bin/env node

const Severus = require("severus-lib");
const fs = require("fs");
const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const path = require("path");

let severus;
try {
  const configPath = path.join(userHome, ".severus-config.json");
  fs.statSync(configPath);
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  severus = new Severus(config);
} catch(err) {
  severus = new Severus();
}


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
  parser.add_argument("-k", "--key", { help: "key file" });

  const args = parser.parse_args();
  if (args.mode === "keygen") {
    fs.writeFileSync("key.txt", randomString());
  } else if (args.mode === "restore") {
    let silverKey;
    if (args.key) {
      silverKey = fs.readFileSync(args.key, "utf8").trim();
    } else {
      silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    }
    if (args.name) {
      silverKey += args.name;
    }
    const files = await severus.restore(silverKey);
    for (const file of files) {
      const p = path.resolve(path.join(process.cwd(), file.name));
      if (!p.startsWith(process.cwd())) {
        continue;
      }
      await mkdirp(path.dirname(p));
      fs.writeFileSync(p, file.content);
    }
  } else if (args.mode === "save") {
    if (!args.name) {
      throw new Error("save command needs name argument.");
      return;
    }
    let silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    const dirPath = args.dir;
    const filePaths = allFiles(dirPath);
    const files = filePaths.filter(filePath => {
      return path.basename(filePath.from) !== ".DS_Store";
    }).map(filePath => {
      const content = fs.readFileSync(filePath.from);
      return {
        name: filePath.pathToSave,
        content,
      }
    });
    try {
      await severus.backup(files, silverKey + args.name);
    } catch(err) {
      throw new Error("Failed to register the data.");
      return;
    }
    try {
      await severus.addBackup(args.name, silverKey);
    } catch(err) {
      throw new Error("Failed to update backup list.");
    }
  } else if (args.mode === "init") {
    const silverSecretDir = path.join(userHome, ".silver", "secret");
    await mkdirp(silverSecretDir);
    if (!fs.existsSync(silverKeyPath)) {
      fs.writeFileSync(silverKeyPath, randomString());
    }
  } else if (args.mode === "list") {
    const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
    const list = await severus.getBackups(silverKey);
    for (const d of list) {
      console.log(d);
    }
  } else if (args.mode === "share") {
    if (args.name) {
      throw new Error("name arg is not able to use with share.");
      return;
    }
    if (!args.key) {
      throw new Error("share command needs a key file.");
      return;
    }
    const silverKey = fs.readFileSync(args.key, "utf8").trim();
    const dirPath = args.dir;
    const filePaths = allFiles(dirPath);
    const files = filePaths.filter(filePath => {
      return path.basename(filePath.from) !== ".DS_Store";
    }).map(filePath => {
      const content = fs.readFileSync(filePath.from);
      return {
        name: filePath.pathToSave,
        content,
      }
    });
    try {
      await severus.share(files, silverKey);
    } catch(err) {
      throw new Error("Failed to register the data.");
    }
  }
}

if (require.main === module) {
  main();
}
