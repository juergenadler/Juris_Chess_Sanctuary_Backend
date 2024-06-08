// LoggingEngine.js

// This module exports a function that returns a class derived from chess-uci.Engine
// The derived class, LoggingEngine, adds two callback functions for logging sent commands and received lines
// Further information on the chess-uci package can be found at:
// https://www.npmjs.com/package/chess-uci  
// https://github.com/tidynail/chess-uci
// especially the Engine class at: 
// https://github.com/tidynail/chess-uci/blob/main/src/engine.js
// Some examples of the chess-uci package can be found at:
// https://www.npmjs.com/package/chess-uci

// Factory function
async function initLoggingEngine() {
  const chessUci = await import('chess-uci');
  const Engine = chessUci.Engine;

  class LoggingEngine extends Engine {
    /**
     * @constructor
     * @param {string} path - Path to the engine executable (base class).
     * @param {boolean} [log=false] - Enable logging (base class).
     * @param {boolean} [log_recv=true] - Log received lines (base class).
     * @param {boolean} [log_send=true] - Log sent commands (base class).
     * @param {function} [onSend=null] - Callback function for sent commands (derived class).
     * @param {function} [onReceive=null] - Callback function for received lines (derived class).
     */
    constructor(path, log = false, log_recv = true, log_send = true, onSend = null, onReceive = null) {
      super(path, log, log_recv, log_send);

      // Additional properties for the derived class
      this.onSend = onSend;
      this.onReceive = onReceive;
    }

    /**
     * @override
     * @param {string} cmd - The command to send to the engine.
     * @return {void}
     */
    send(cmd) {
      try {
        if (this.onSend) {
          this.onSend(cmd);
        }
        super.send(cmd);
      } catch (error) {
        console.error(`Error sending command "${cmd}": ${error.message}`);
      }
    }

    /**
     * @override
     * @param {string} line - The line received from the engine.
     * @return {void}
     */
    parse(line) {
      try {
        if (this.onReceive) {
          this.onReceive(line);
        }
        super.parse(line);
      } catch (error) {
        console.error(`Error parsing line "${line}": ${error.message}`);
      }
    }

    /**
     * Static method to start the engine and return an instance of LoggingEngine
     * @param {string} path - Path to the engine executable (base class).
     * @param {boolean} [log=false] - Enable logging (base class).
     * @param {boolean} [log_recv=true] - Log received lines (base class).
     * @param {boolean} [log_send=true] - Log sent commands (base class).
     * @param {function} [onSend=null] - Callback function for sent commands (derived class).
     * @param {function} [onReceive=null] - Callback function for received lines (derived class).
     * @return {LoggingEngine}
     */
    static async start(path, log = false, log_recv = true, log_send = true, onSend = null, onReceive = null) {
      try {
        const engine = new LoggingEngine(path, log, log_recv, log_send, onSend, onReceive);
        await engine.uci();
        return engine;
      } catch (error) {
        console.error(`Error starting engine: ${error.message}`);
        throw error;
      }
    }
  }

  return LoggingEngine;
}

module.exports = initLoggingEngine;
