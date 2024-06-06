// Stockfishcontroller.js 

const mongoose = require('mongoose');
const { Chess } = require('chess.js');
const fs = require('fs').promises;
const path = require('path');

const PgnSchema = require('../schemas/pgnSchema');
const {
  addPgnToDBImpl,
  getPgnByPgnIdImpl,
  updatePgnByPgnIdImpl
} = require('./pgnController'); // Importing the implementation functions from the controller

const initLoggingEngine = require('./LoggingEngine'); // Import the LoggingEngine initialization function

// Path to the Stockfish engine executable. Actually we are in the controllers folder, so we need to go up two levels to find the engines folder.
const stockfishPath = '../../engines/stockfish/16/stockfish-windows-x86-64-sse41-popcnt.exe';
const enginePath = path.resolve(__dirname, stockfishPath);

/// FEN start position for the chess board. As we are using the UCI protocol, we need to provide the initial position in Forsyth-Edwards Notation (FEN).
// As we build up the game history from the initial position by adding a moves array we need this constant more often ;-)
const FENstartposition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Helper: Check if the file exists 
const doesExist = async (filePath) => {
  try {
    await fs.access(filePath, fs.constants.F_OK);
  } catch (err) {
    throw new Error(`File ${filePath} does not exist.`);
  }
};

// Helper ...and is executable
const isExecutable = async (filePath) => {
  try {
    await fs.access(filePath, fs.constants.X_OK);
  } catch (err) {
    throw new Error(`File ${filePath} is not executable.`);
  }
};


// Send log updates to all connected clients via SSE. Called by the overrides in the LoggingEngine class.
const sendLogUpdateReceived = (data) => {
  clients.forEach((client) =>
    client.res.write(`<< ${JSON.stringify(data)}\n\n`)
  );
};

// Send log updates to all connected clients via SSE. Called by the overrides in LoggingEngine class.
const sendLogUpdateSent = (data) => {
  clients.forEach((client) =>
    client.res.write(`>> ${JSON.stringify(data)}\n\n`)
  );
};

let stockfish; // Stockfish engine instance, is being initialized in initEngine.

//
// initEngine: Initialize Stockfish
//
const initEngine = async (req, res) => {
  try {
    await doesExist(enginePath);
    await isExecutable(enginePath);
    if (!stockfish) {
      const LoggingEngine = await initLoggingEngine();
      stockfish = await LoggingEngine.start(enginePath, true, true, true, sendLogUpdateSent, sendLogUpdateReceived);

      stockfish.position();      // Set the initial position
      await stockfish.isready(); // Wait for the engine to be ready
      res
        .status(200)
        .json({ status: "Stockfish engine initialized and ready to use." });
    } else {
      res
        .status(200)
        .json({ status: "Stockfish engine is already initialized." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//
// quitEngine
//
// POST: /engine/quit
const quitEngine = async (req, res) => {
  try {
    if (!stockfish) {
      return res.status(500).json({ error: 'Stockfish engine is not initialized.' });
    }

    await stockfish.quit();
    stockfish = null; // Reset the stockfish variable, hoping we do not eat resources

    res.status(200).json({ status: 'Stockfish terminated successfully.' });
  } catch (error) {
    console.error('Failed to quit:', error);
    res.status(500).json({ error: 'Failed to quit', details: error.message });
  }
};

//
// stopEngine: Stop the Stockfish engine calculations
//
// POST: /engine/stop
const stopEngine = async (req, res) => {
  try {
    if (!stockfish) {
      return res.status(500).json({ error: 'Stockfish engine is not initialized.' });
    }

    const result = await stockfish.stop(); // How to get the best move?
    res.status(200).json({ status: 'Stockfish calculations stopped!' });
  } catch (error) {
    console.error('Failed to stop calculations:', error);
    res.status(500).json({ error: 'Failed to stop calculations', details: error.message });
  }
};



/**
 * MakeMove
 * POST: /engine/move/:depth
 * Handles a request to make a move with the Stockfish engine.
 * The search depth for the move can be specified as a parameter in the URL.
 * If no depth is specified, a default value of 20 is used.
 *
 * req -  The search depth should be specified as a parameter in the URL.
 * res -  The best move found by the engine will be included in the response body.
 */
const makeMove = async (req, res) => {
  try {
    if (!stockfish) {
      return res
        .status(500)
        .json({ error: "Stockfish engine is not initialized." });
    }

    const depth = req.params.depth || 20;

    stockfish.go(
      { depth: Number(depth) },
      //  (info) => {
      //    if (info.depth) {
      //      const logMessage = `depth: ${info.depth}, info: ${JSON.stringify(
      //        info
      //      )}`;
      //      console.log(logMessage);
      //      sendLogUpdateSent(logMessage); // Send this to the frontend via SSE
      //    }
      //  },
      //  (result) => {
      //    const bestpv = stockfish.pvs[0];
      //    const logMessage = `${bestpv.score.str}/${bestpv.depth} ${result.bestmove} in ${bestpv.time}ms, ${bestpv.nodes} searched`;
      //    console.log(logMessage);
      //    sendLogUpdateSent(logMessage); // Send this to the frontend via SSE
      //    res.status(200).json({ bestMove: result.bestmove });
      //  }
    );
  } catch (error) {
    console.error("Failed to make move:", error);
    res
      .status(500)
      .json({ error: "Failed to make move", details: error.message });
  }
};


//
//  analyze
// 
//  POST: /engine/analyze
//  Summary: Set analysis modus that can be interrrupted by stopping the engine. So you have to stop the engine explicitly.
//  Example: POST http://localhost:7000/stockfishrouter/engine/analyze
//   const data = await response.json();
//   const bestMove = data.bestmove;
//   const ponder = data.ponder;
//
const analyze = async (req, res) => {
  try {
    stockfish.go(
      //{ depth: "infinite" }, // anything else to set the engine in analysis mode crashes the app
      //(info) => {
      //  if (info.depth) {
      //    const logMessage = `depth: ${info.depth}, info: ${JSON.stringify(
      //      info
      //    )}`;
      //    console.log(logMessage);
      //    sendLogUpdateSent(logMessage); // Send this to the frontend via SSE
      //  }
      //},
      //(result) => {
      //  const bestpv = stockfish.pvs[0];
      //  const logMessage = `${bestpv.score.str}/${bestpv.depth} ${result.bestmove} in ${bestpv.time}ms, ${bestpv.nodes} searched`;
      //  console.log(logMessage);
      //  sendLogUpdateSent(logMessage); // Send this to the frontend via SSE
      //  res.status(200).json({ bestMove: result.bestmove });
      //}
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//
//  Setposition
//  POST: /engine/setposition
//
// Expecting FEN string and LAN array in the request body. We can handle this as JSON object,
// also in Postman, we can use the raw JSON format to send the request.
//
// The moves in the "position" command of the UCI protocol are expected to be in
// long algebraic notation(LAN). Each move consists of the starting square and the
// ending square, optionally followed by the promotion piece(in case of pawn promotion).
//
// Examples:
// e2e4: Pawn moves from e2 to e4
// g1f3: Knight moves from g1 to f3
// e7e8q: Pawn moves from e7 to e8 and promotes to a queen
//
//{
//  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
//    "moves": ["e2e4", "e7e5", "g1f3"]
//}
// or
//{
//  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
//    "pgn": "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6"
//}
const setPosition = async (req, res) => {
  try {
    if (!stockfish) {
      return res.status(500).json({ error: 'Stockfish engine is not initialized.' });
    }

    const fen = req.body.fen || FENstartposition; // Use the FEN string from the request body, or the start position if it's not provided
    const moves = req.body.moves || []; // Use the moves from the request body, or an empty array if they're not provided
    await stockfish.position({ fen, moves });
    res.status(200).json({ status: 'Position set successfully' });
  } catch (error) {
    console.error('Failed to set position:', error);
    res.status(500).json({ error: 'Failed to set position', details: error.message });
  }
};


//
// setMoves: A variation of setPosition() that accepts moves as a URL parameter
// POST: /engine/setmoves/:moves
//
const setMoves = async (req, res) => {
  try {
    // Extract and decode the moves from the URL
    const moves = decodeURIComponent(req.params.moves);

    // Split the moves by spaces
    const components = moves.split(' ');

    // Initialize variables for FEN and moves
    let fen = null;
    let moveList = [];
    let invalidMoves = [];

    // Check if the first component is a FEN position string
    // No validation is done here, as the chess.js library will handle this
    if (components[0].length > 10) {
      fen = components[0];
      moveList = components.slice(1);
    } else {
      moveList = components;
    }

    // Set to the default starting position if FEN is still null
    if (!fen) {
      fen = FENstartposition;
    }

    // Identify invalid moves and log them
    // This is just a simple check to ensure that the moves are in the correct format
    // Example moves: ["e2e4", "e7e5", "g7g8q"]
    moveList.forEach(move => {
      if (move.length < 4 || move.length > 5) {
        invalidMoves.push(move);
      }
    });

    if (invalidMoves.length > 0) {
      console.log('Invalid moves:', invalidMoves);
    }

    // Call the chess engine with the parsed FEN and all moves
    const positionResult = await stockfish.position({ fen, moves: moveList });

    // Send the response (you might want to customize this based on your needs)
    res.send(`Received position: ${JSON.stringify(positionResult)}`);
  } catch (error) {
    // Handle potential errors
    res.status(400).send(`Error processing moves: ${error.message}`);
  }
};



//
// load game by pgn id
// GET: /game/:id
//
const loadGame = async (req, res) => {
  const { id } = req.params;
  try {
    const game = await getPgnByPgnIdImpl(id);
    if (game) {
      res.status(200).json({ game });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


///
// saveGame
//
// save a game as new, so we need the pg_id returned to use it
//
// Parameters: req.body
//
//
const saveGame = async (req, res) => {
  try {
    const newPgn = await addPgnToDBImpl(req.body); // Save the game to the database (function from pgnController.js))   
    res.status(201).json({ status: 'Game saved', game: newPgn });
    return newPgn; // Return the new game object, so that it can be used in the response
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//
// updateGame
// 
const updateGame = async (req, res) => {
  const { id } = req.params;
  try {
    const game = await updatePgnByPgnIdImpl(id, req.body);
    if (game) {
      res.status(200).json({ game });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SSE endpoint to handle client connections
let clients = []; // Array to hold SSE clients

const sse = (req, res) => {
  console.log("SSE Connection established");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.status(200).flushHeaders(); // Send the headers and establish the SSE connection

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };

  clients.push(newClient);

  req.on("close", () => {
    console.log("SSE CONNECTION CLOSED");
    clients = clients.filter((client) => client.id !== clientId);
  });
};



module.exports = {
  initEngine,
  quitEngine,
  stopEngine,
  analyze,
  setPosition,
  setMoves,
  makeMove,
  saveGame,
  loadGame,
  updateGame,
  sse
};
