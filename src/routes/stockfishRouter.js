//
// stockfishRouter.js
//

const express = require('express');
const router = express.Router();

const {
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
} = require("../controllers/stockfishController");

// Initialize the Stockfish engine
router.post('/engine/init', initEngine);

// Terminate the Stockfish engine
router.post('/engine/quit', quitEngine);

// Stop the Stockfish engine calculations
router.post('/engine/stop', stopEngine);

// Get the best move from the Stockfish engine
router.get('/engine/bestmove', getBestMove);

// Set the position of the chess board via request body
router.post('/engine/setposition', setPosition);

// Set the moves on the chess board as URL parameters
// Example: /engine/setmoves/e2e4 e7e5
router.post('/engine/setmoves/:moves', setMoves);

// Make a move with the Stockfish engine
router.post('/engine/move/:depth', makeMove);

// Set the Stockfish engine in analysis mode
router.post('/engine/analyze', analyze);

// Save a game
router.post('/game', saveGame);

// Load a game by its ID
router.get('/game/:id', loadGame);

// Update a game by its ID
router.put('/game/:id', updateGame);

// SSE endpoint 
router.get('/sse', sse); 

module.exports = router;
