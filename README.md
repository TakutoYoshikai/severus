# severus
severus is a tool for encryption data and saving the encrypted data into P2P network. severus uses Polygon Mumbai Network.

### Requirements
* macOS or Ubuntu
* Node.js
* npm

### Usage
**install**
```bash
npm install --save TakutoYoshikai/severus
```

**saving data needs to run server for writing data to blockchain.**
```bash
cp example.config.json config.json
# Edit config.json
severus-server ./config.json
```

**initialize private key**

private key is related to one directory.
```bash
severus init
# $HOME/.silver/secret/private-key.txt is generated. 
# You can access the data by using this private-key.txt
```

**regenerate private key**
```bash
rm $HOME/.silver/secret/private-key.txt
severus init
```

**save**
```bash
severus save <DIRECTORY TO SAVE>
```

**restore**
```bash
cd <DESTINATION DIR>
severus restore
```

### License
MIT License
