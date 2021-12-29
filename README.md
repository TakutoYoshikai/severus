# severus
severus is a tool for encryption data and saving the encrypted data into P2P network. severus uses Polygon Mumbai Network.

### Requirements
* macOS or Ubuntu
* Node.js
* npm

### Usage
**install**
```bash
npm install -g TakutoYoshikai/severus
```

**initialize private key**
```bash
severus init
# $HOME/.silver/secret/private-key.txt is generated. 
# You can access the data by using this private-key.txt
# A private key is related to one directory.
```

**regenerate private key**
```bash
rm $HOME/.silver/secret/private-key.txt
severus init
```

**save**
You have to run [server](https://github.com/TakutoYoshikai/severus-server) before using save command.

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
