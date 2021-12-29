#!/usr/bin/env node

const { backup, restore } = require("severus-lib");

const userHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const fs = require("fs");
const path = require("path");
const silverKeyPath = path.join(userHome, ".silver", "secret", "private-key.txt");

const silverKey = fs.readFileSync(silverKeyPath, "utf8").trim();
const mkdirp = require("mkdirp");

function randomString() {
  const alphabets = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 128; i++) {
    s += alphabets[Math.floor(Math.random() * alphabets.length)];
  }
  return s;
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
