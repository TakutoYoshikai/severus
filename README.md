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

**generate a key file for sharing**
```bash
severus keygen
```

**save**

You have to run [server](https://github.com/TakutoYoshikai/severus-server) before using save command.

```bash
severus save -d <DIRECTORY TO SAVE> -n <DIRECTORY NAME>
```

**share**

share command saves directory. It's not rewritable.
You have to run [server](https://github.com/TakutoYoshikai/severus-server) before using share command.

```bash
severus share -d <DIRECTORY TO SHARE> -k <KEY FILE>
```

**restore**
```bash
cd <DESTINATION DIR>

severus restore
# or 
severus restore -n <DIRECTORY NAME>
# specify a key file
severus restore -k <KEY FILE>
```

**list of data saved**
```bash
severus list
```

### License
MIT License
