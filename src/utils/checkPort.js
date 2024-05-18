//
// checkPort.js
// 
// (JuergenAdler, 5.5.2024)
// The motivation was given to implement this functiionality as the port to be used
// was blocked by the node/nodemon process before debugging in VS Code as in VS 2022.
// In VS 2022 a lot of this could be handled by this setting in the project file:
//
// <SaveNodeJsSettingsInProjectFile>True</SaveNodeJsSettingsInProjectFile>
// 
// should be present and is not, dependent on the history of the project.
// 
const net = require('net');
async function isPortInUse(port) {
  return new Promise((resolve, reject) => {
    // Create a new TCP server instance
    const testServer = net.createServer();

    // Event handler for error event
    testServer.once('error', (err) => {
      // If the error is due to the port being in use, resolve with true
      if (err.code !== 'EADDRINUSE') return reject(err);
      resolve(true);
    });

    // Event handler for listening event
    testServer.once('listening', () => {
      // Once the server starts listening, immediately close it
      // and resolve with false, indicating that the port is not in use
      testServer.once('close', () => resolve(false)).close();
    });

    // Start the server and make it listen on the specified port
    testServer.listen(port);
  });
}

module.exports = isPortInUse;
