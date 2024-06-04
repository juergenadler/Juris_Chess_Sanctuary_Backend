//
// stockfishRouter.js
//

const express = require('express');
const router = express.Router();

const {
  initEngine,
  analyze,
  setPosition,
  makeMove,
  saveGame,
  loadGame,
  updateGame
} = require("../controllers/stockfishController");

// Initialize the Stockfish engine
router.post('/engine/init', initEngine);

// Set the position of the chess board
router.post('/engine/setposition', setPosition);

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

module.exports = router;
