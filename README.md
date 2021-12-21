# severus
severus is a tool for encryption data and saving the encrypted data into P2P network. 

### Requirements
* macOS or Ubuntu
* Node.js
* npm

### Usage
**install**
```bash
npm install --save TakutoYoshikai/severus
```

**saving data needs to run server to writing data to blockchain.**
```bash
cp example.config.json config.json
# Edit config.json
severus-server ./config.json
```

**init**
```bash
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
