// Stockfishcontroller.js 

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Importing the implementation functions from the controller for the PGN schema
const PgnSchema = require('../schemas/pgnSchema');
const {
  addPgnToDBImpl,
  getPgnByPgnIdImpl,
  updatePgnByPgnIdImpl
} = require('./pgnController');

// Import the LoggingEngine initialization function. This function is asynchronous and returns a promise.
// The promise resolves to the LoggingEngine class, which is derived from chess-uci.Engine. (This is because we are obliged to import
// the chess-uci package new style, as we are using ES6 modules in the LoggingEngine.js file.)
const initLoggingEngine = require('./LoggingEngine');

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
// initEngine: POST: /engine/init
//
// Initialize Stockfish
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
// quitEngine: POST: /engine/quit
//
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

// Store the result of the analysis here.
// Reinitialize the variable in every function that calls the go() function before calling it.
//
// See getBestMove() function.
// Keep in mind that the result of the analysis are stored in LAN format.

let s_analysisResult = ""; 

//
// stopEngine: POST /engine/stop
//
// Stop the Stockfish engine calculations. 
// Best move found so far can be retrieved from the callback function of the go() function.
// 
const stopEngine = async (req, res) => {
  try {
    if (!stockfish) {
      return res.status(500).json({ error: 'Stockfish engine is not initialized.' });
    }

    // We can only stop the engine here. Contrary to the go() function, stop() does not return the best move
    // that has been found so far. This functionality is only available in the go() function when eveluatiing the callbacks.

    await stockfish.stop();
  
    res.status(200).json({ status: 'Analysis stopped. Use GET /engine/bestmove to see the results so far!'});
  } catch (error) {
    console.error('Failed to stop calculations:', error);
    res.status(500).json({ error: 'Failed to stop calculations', details: error.message });
  }
};

/**
 * MakeMove: POST /engine/move/:depth
 * 
 * Make a move with the Stockfish engine, essentially performing the go() function.
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
    s_analysisResult = ""; // Reset the analysis result. 

    stockfish.go(
      { depth: Number(depth) },
      null,
      (result) => {
        s_analysisResult = result.bestmove; 
        sendLogUpdateSent(result.bestmove); // Send this to the frontend via SSE
        // Contrary to the stopEngine/analyze mechanism,
        // we have two use cases here:
        // 1) go() is called within makeMove() and ends with the best move naturally.
        // In this case the next line is correct and useful :-) because we are on the same endpoint.
        // 2) go() is called and terminated by stop() or analyze().
        // Then we have to retrieve the best move from the global variable s_analysisResult
        // via GET /engine/bestmove
        res.status(200).json({ status: 'Best move found so far: ', bestMove: result.bestmove });
      }
    );
  } catch (error) {
    console.error("Failed to make move:", error);
    res
      .status(500)
      .json({ error: "Failed to make move", details: error.message });
  }
};


//
//  analyze:  POST /engine/analyze
//
//  Example: POST http://localhost:7000/stockfishrouter/engine/analyze
//
//  Summary: Set analysis modus. This mode can be interrrupted by stopping the engine.
//  So we have to stop the engine explicitly.
//  Problem here
// 
const analyze = async (req, res) => {
  try {
    s_analysisResult = ""; // Reset the analysis result

    stockfish.go(
      { depth: "infinite" }, // anything else to set the engine in analysis mode crashes the app
      null,
      (result) => {
        s_analysisResult = result.bestmove;
        sendLogUpdateSent(result.bestmove); // Send this to the frontend via SSE

        // Ironically we can retrieve the best move here, but not in the stopEngine function.
        // So we have to store it in a global variable and retrieve it from there.
        // This means we retrieve the best move in this order:
        // POST /engine/analyze -> POST /engine/stop -> GET /engine/bestmove
        // So the next line is correct but useless :-|
        res.status(200).json({ status: 'Best move found so far: ', bestMove: result.bestmove });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//
// getBestMove: GET /engine/bestmove
//
const getBestMove = async (req, res) => {
  try {
    if (!s_analysisResult) {
      return res.status(404).json({ error: 'No analysis result available.' });
    }

    res.status(200).json({ status: 'Best move found so far: ', bestMove: s_analysisResult });
  } catch (error) {
    console.error('Failed to retrieve best move:', error);
    res.status(500).json({ error: 'Failed to retrieve best move', details: error.message });
  }
};



//
//  setPosition: POST /engine/setposition
//
// Expecting a FEN string and a LAN array in the request body. We can handle this as JSON object,
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
// setMoves: POST /engine/setmoves/:moves
//
// A variation of setPosition() that accepts moves as an URL parameter
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
// loadGame: GET /game/:id
// load game by pgn_id
// 
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
// saveGame: POST /game
//
// save a game as new, so we need the pg_id returned to use it
//
// Parameters: req.body
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
// updateGame: PUT /game/:id
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

  setInterval(() => {
    console.log("SSE Connection still alive");
    // res.write('data: ' + JSON.stringify({ message: 'SSE still alive' }) + '\n\n');
  }, 5000);


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
  sse,
  getBestMove
};
