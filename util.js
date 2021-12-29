
const fs = require("fs");
const path = require("path");

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

module.exports = {
  allFiles,
  randomString,
}
