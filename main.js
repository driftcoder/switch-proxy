const fs = require('fs');
const os = require('os');
const readline = require('readline');
const childProcess = require('child_process');

let proxyProcess;
let expressProcess;
let error;

console.log('Switch Proxy.\n');

const networkInterfaceList = getNetworkInterfaces();

if (networkInterfaceList.length < 1) {
  console.log('No usable IP found. Make sure you are connected to a network.');
  return;
}

if (networkInterfaceList.length == 1) {
  startProxyOnInterface(networkInterfaceList[0]);
  return;
}

if (networkInterfaceList.length > 1) {
  chooseInterface(networkInterfaceList, (networkInterface) => startProxyOnInterface(networkInterface));
  return;
}

function getNetworkInterfaces() {
  let networkInterfaceList = [];
  const networkInterfaces = os.networkInterfaces();

  Object.keys(networkInterfaces).forEach((networkInterfaceId) => {
    networkInterfaces[networkInterfaceId].forEach((networkInterface) => {
      if (networkInterface.family !== 'IPv4' || networkInterface.internal !== false) {
        return;
      }

      networkInterfaceList.push({
        id: networkInterfaceId,
        ip: networkInterface.address,
      });
    });
  });

  return networkInterfaceList;
}

function chooseInterface(networkInterfaceList, callback) {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Multiple interfaces found.');

  networkInterfaceList.forEach((networkInterface, index) => {
    console.log(`${index + 1}: ${networkInterface.id} (${networkInterface.ip})`);
  });

  readlineInterface.question('Choose one: ', (answer) => {
    readlineInterface.close();
    answer = parseInt(answer);

    if (answer > 0 & answer <= networkInterfaceList.length) {
      console.log();
      callback(networkInterfaceList[answer]);
    } else {
      console.log('Invalid choice. Try again.\n');
      chooseInterface(networkInterfaceList, callback);
    }
  });
}

function startProxyOnInterface(networkInterface) {
  fs.writeFile('.dns-proxy.rc', getConfigurationFileContents(networkInterface.ip), (error) => {
    if(error) {
        console.log('Unable to write a configuration file.');
        console.log(error);
        return;
    }

    console.log('Starting server on ' + networkInterface.ip);

    proxyProcess = childProcess.spawn('npm', ['run', 'start-dns']);
    expressProcess = childProcess.spawn('npm', ['run', 'start-server']);

    proxyProcess.on('close', () => processError('Proxy error.'));
    expressProcess.on('close', () => processError('Server error.'));
  });
}

function getConfigurationFileContents(ip) {
  return `; THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
[servers]
  conntest.nintendowifi.net = ${ip}`;
}

function processError(message) {
  if (error) {
    return;
  }

  error = true;
  proxyProcess && proxyProcess.kill();
  expressProcess && expressProcess.kill();

  console.log();
  console.log(message);

  if (os.type() != 'Windows_NT') {
    console.log('Try running with sudo.');
  }
}