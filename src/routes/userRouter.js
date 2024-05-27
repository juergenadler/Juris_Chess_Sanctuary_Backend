//
// userRouter.js
//

// Express matches routes based on the order they are defined, but it also considers the specificity of the route paths. 
// More specific routes should be defined before less specific ones to ensure they are matched correctly.
// So the current guidelines ;-) are:
// 1) Paths that are general: use plural
// 2) Paths that are specific: use singular. Specific is everything that resolves to parameters

const express = require('express');
const router = express.Router();
const {
  loginUser,
  signUpUser,
  getAllUsers,
  getUserByEmail,
  deleteUserByEmail,
  getAllAssociatedGamesByUserEmail,
  getGameByPgnIdAndUserEmail,
  addGameByPgnIdAndUserEmail,
  deleteGameByPgnIdAndUserEmail,
  deleteAllGamesByUserEmail
} = require('../controllers/userController');

// Login user
router.post('/login', loginUser);

// Sign up user
router.post('/signup', signUpUser);

// Get all users
router.get('/users', getAllUsers);

// Get user by email
router.get('/user/:email', getUserByEmail);

// Delete user by email
router.delete('/user/:email', deleteUserByEmail);

// Get all associated games by user email
router.get('/user/:email/pgngames', getAllAssociatedGamesByUserEmail);

// Get game by PGN ID and user email
router.get('/user/:email/pgngame/:pgnId', getGameByPgnIdAndUserEmail);

// Add game by PGN ID and user email
router.post('/user/:email/pgngame/:pgnId', addGameByPgnIdAndUserEmail);

// Delete game by PGN ID and user email
router.delete('/user/:email/pgngame/:pgnId', deleteGameByPgnIdAndUserEmail);

// Delete all games by user email
router.delete('/user/:email/pgngames', deleteAllGamesByUserEmail);

module.exports = router;
