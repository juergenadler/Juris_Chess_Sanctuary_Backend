// controllers/chessController.js

const mongoose = require('mongoose');
const { Chess } = require('chess.js');
const fs = require('fs').promises;
const path = require('path');


const PgnSchema = require('../schemas/pgnSchema');
const {
  addPgnToDBImpl,
  getPgnByPgnIdImpl,
  updatePgnByPgnIdImpl } = require('./pgnController'); // Is this good practice? Should we import the implementation functions from the controller?


// Path to the Stockfish engine executable. Actually we are in the controllers folder, so we need to go up two levels to find the engines folder.

const stockfishPath = '../../engines/stockfish/16/stockfish-windows-x86-64-sse41-popcnt.exe';
const enginePath = path.resolve(__dirname, stockfishPath);

/// FEN start position for the chess board. As we are using the UCI protocol, we need to provide the initial position in Forsyth-Edwards Notation (FEN).
// As we build up the game history from the initial position by adding a moves array we need this constant more often ;-)
const FENstartposition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Check if the file exists and is executable
const doesExist = async (filePath) => {
  try {
    await fs.access(filePath, fs.constants.F_OK);
  } catch (err) {
    throw new Error(`File ${filePath} does not exist.`);
  }
};

const isExecutable = async (filePath) => {
  try {
    await fs.access(filePath, fs.constants.X_OK);
  } catch (err) {
    throw new Error(`File ${filePath} is not executable.`);
  }
};

let Engine;

// Import the chess-uci library (no other chance to do this, because ES6 and "require"" is blocked)
import('chess-uci').then(chessUci => {
  Engine = chessUci.Engine;
});

let stockfish; // Stockfish engine instance, is being initialized in initEngine.


const initEngine = async (req, res) => {
  try {
    await doesExist(enginePath);
    await isExecutable(enginePath);
    if (!stockfish) {
      // Make sure the Engine class has been imported
      if (!Engine) {
        throw new Error('Engine class not loaded yet');
      }
      stockfish = new Engine(enginePath, { log: true });   // log all messages
      await stockfish.uci();
      stockfish.position(); // Set the initial position, which might not be the start position later
      await stockfish.isready();  
   
      res.status(200).json({ status: 'Stockfish engine initialized and ready to use.' });
    } else {
      res.status(200).json({ status: 'Stockfish engine is already initialized.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * Handles a request to make a move with the Stockfish engine.
 * The search depth for the move can be specified as a parameter in the URL.
 * If no depth is specified, a default value of 20 is used.
 *
 * req -  The search depth should be specified as a parameter in the URL.
 * res -  The best move found by the engine will be included in the response body.
 */
const makeMove = async (req, res) => {
  try {
    // Check if the Stockfish engine is initialized
    if (!stockfish) {
      return res.status(500).json({ error: 'Stockfish engine is not initialized.' });
    }

    // Get the search depth from the URL, or use a default value of 20
    const depth = req.params.depth || 20;

    // Start the engine's calculation process with the specified search depth
    const result = await stockfish.go({ depth: Number(depth) });

    // Send a response with the best move found by the engine
    res.status(200).json({ bestMove: result.bestmove });
  } catch (error) {
    // Log the error and send a response with an error status code and message
    console.error('Failed to make move:', error);
    res.status(500).json({ error: 'Failed to make move', details: error.message });
  }
};


//
//  analyze
//  POST: /engine/analyze
//  Summary: Set analysis modus that can be interrrupted by stopping the engine.
const analyze = async (req, res) => {
  try {
    if (stockfish) {
      const result = await stockfish.go(); // This should pass "go infinite" and run until stopped explicitly
      const bestmove = result.bestmove;    // So: What do we get here? Some implementations rely to handle this after they stopped the engine
      res.status(200).json({ status: 'Stockfish engine in analysis mode.' });
    } else {
      res.status(400).json({ status: 'Stockfish engine not initialized.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

//
//  Setposition
//  POST: /engine/setposition
//
//  Expecting FEN string and LAN array in the request body. We can handle this as JSON object,
// also in Postman, we can use the raw JSON format to send the request.
//
// The moves in the position command of the UCI protocol are expected to be in
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

    const fen = req.body.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Use the FEN string from the request body, or the start position if it's not provided
    const moves = req.body.moves || []; // Use the moves from the request body, or an empty array if they're not provided
    await stockfish.position({ fen, moves });
    res.status(200).json({ status: 'Position set successfully' });
  } catch (error) {
    console.error('Failed to set position:', error);
    res.status(500).json({ error: 'Failed to set position', details: error.message });
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



module.exports = {
  initEngine,
  analyze,
  setPosition,
  makeMove,
  saveGame,
  loadGame,
  updateGame 
};