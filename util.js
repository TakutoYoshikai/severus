
const fs = require("fs");
const path = require("path");
const glob = require("glob");

function randomString() {
  const alphabets = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 128; i++) {
    s += alphabets[Math.floor(Math.random() * alphabets.length)];
  }
  return s;
}
function allFiles(dirPath) {
  return mapFilePathPair(glob.sync(path.join(dirPath, "**", "*")).filter(_path => {
    const stats = fs.statSync(_path);
    return !stats.isDirectory();
  }), dirPath);
}

function removeSlash(filePath) {
  if (filePath.startsWith("/")) {
    return filePath.slice(1);
  }
  return filePath;
}
function mapFilePathPair(filePaths, dirPath) {
  const absPath = path.resolve(dirPath);
  return filePaths.map(filePath => {
    return {
      from: path.resolve(filePath),
      pathToSave: removeSlash(path.resolve(filePath).replace(absPath, "")),
    }
  });
}


module.exports = {
  allFiles,
  randomString,
}
