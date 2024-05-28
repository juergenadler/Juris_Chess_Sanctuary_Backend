//
// userController.js
//

const UserSchema = require("../schemas/UserSchema");
const PgnSchema = require("../schemas/pgnSchema"); // SORRY: Express is highly case sensitive! Providing "../schemas/PgnSchema" here leads to an error.

const jwt = require("jsonwebtoken");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "2d" });
};

// Login user
// 
const loginUser = async (req, res) => {
  let { email, password } = req.body;

  try {
    // Convert email to lowercase before attempting login
    email = email.toLowerCase();

    const user = await UserSchema.login(email, password);

    //create token
    const token = createToken(user._id);

    res.status(200).json({ email, token });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// POST: Sign up user
//
// So if testing the POST request (Postman etc.),
// 1) place these values in the request BODY.
// 2) use the x-www-form-urlencoded option.
// 3) authorization: Bearer token when it is in your environment variables. 
// Then Auth Type: JWT Bearer, secret: from your environment variables.
const signUpUser = async (req, res) => {
  let { email, password } = req.body;

  try {
    // Convert email to lowercase before signing up
    email = email.toLowerCase();

    const user = await UserSchema.signup(email, password);

    // Create token
    const token = createToken(user._id);
    res.status(200).json({ email, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// GET: Retrieve all users
//
const getAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await UserSchema.find();

    // If no users found, return a 404 Not Found response
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // If users found, return a 200 OK response with the users and the count
    res.status(200).json({ count: users.length, users });

  } catch (error) {
    // If an error occurs, return a 500 Internal Server Error response
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET: Retrieve one user by email (what else?)
// As email is unique, chances are fine...
const getUserByEmail = async (req, res) => {
  try {
    let { email } = req.params; // Extracting email from request parameters

    // Convert email to lowercase before searching
    email = email.toLowerCase();

    // Find the user by email in the database
    const user = await UserSchema.findOne({ email });   

    // If user not found, return a 404 Not Found response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user found, return a 200 OK response with the user data
    res.status(200).json(user);
  } catch (error) {
    // If an error occurs, return a 500 Internal Server Error response
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// DELETE: Delete one user by email
//
// 28.05.2024: OK
const deleteUserByEmail = async (req, res) => {
  try {
    let { email } = req.params;

    // Convert email to lowercase before searching and deleting
    email = email.toLowerCase();

    // Find and delete the user by email
    const deletedUser = await UserSchema.findOneAndDelete({ email });

    // If user not found, return a 404 Not Found response
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user found and deleted successfully, return a 200 OK response
    res.status(200).json({ message: 'User deleted successfully', deletedUser });
  } catch (error) {
    // If an error occurs, return a 500 Internal Server Error response
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};


//
// GET: Retrieve all associated games by user email
//
// 28.05.2024: OK
const getAllAssociatedGamesByUserEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const user = await UserSchema.findOne({ email }).populate('pgngames').exec();   
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user.pgngames);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving associated games' });
  }
};

//
// GET: Retrieve one game associated by user email
// populating the pgngames array in the UserSchema collection so that really a game is returned.
//
// 28.05.2024: OK
const getGameByPgnIdAndUserEmail = async (req, res) => {
  const { email, pgnId } = req.params;
  try {
    const user = await UserSchema.findOne({ email }).populate('pgngames').exec();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    let games = user.pgngames;
    if (pgnId) {
      games = games.filter(game => game.pgn_id === pgnId);
      if (games.length === 0) {
        return res.status(404).json({ message: 'Game not found for the user' });
      }
    }
    return res.json(games);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error retrieving associated games' });
  }
};

//
// POST: addGameByPgnIdAndUserEmail
//
// AS we are dealing with the UserSchema, we are not changing the PgnSchema collection.
// We are only adding a reference to the game in the UserSchema collection.
// This means: We add an ObjectId to the pgngames array in the UserSchema collection.
//
// 28.05.2024: OK
const addGameByPgnIdAndUserEmail = async (req, res) => {
  const { email, pgnId } = req.params;

  try {
    // Find the user by email
    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the game by its PGN ID
    const game = await PgnSchema.findOne({ pgn_id: pgnId });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // REVIEW: Is it really user.pgngames.includes(game._id))?? How is pgngames organized?

    // Check if the game is already associated with the user
    if (user.pgngames.includes(game._id)) {
      return res.status(400).json({ message: 'Game already associated with the user' });
    }

    // Add the game reference to the user's list of games
    user.pgngames.push(game._id);
    await user.save();

    return res.status(201).json({ message: 'Game added to user successfully', user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error adding game to user' });
  }
};

//
// DELETE: Delete game by PGN ID and user email
//
// 28.05.2024: OK
const deleteGameByPgnIdAndUserEmail = async (req, res) => {
  const { email, pgnId } = req.params;

  try {
    // Find the user by email
    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the game by its PGN ID
    const game = await PgnSchema.findOne({ pgn_id: pgnId });
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if the game is associated with the user
    if (!user.pgngames.includes(game._id)) {
      return res.status(404).json({ message: 'Game not associated with the user' });
    }

    // Remove the game reference from the user's list of games
    user.pgngames = user.pgngames.filter(id => !id.equals(game._id));
    await user.save();

    return res.json({ message: 'Game deleted from user successfully', user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting game from user' });
  }
};

//
// deleteAllGamesByUserEmail DELETE: Delete all games by user email
//
// 28.05.2024: OK
const deleteAllGamesByUserEmail = async (req, res) => {
  const { email } = req.params;

  try {
    // Find the user by email
    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove all games associated with the user
    user.pgngames = [];
    await user.save();

    return res.json({ message: 'All games deleted from user successfully', user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting games from user' });
  }
};


module.exports = {
  loginUser,
  signUpUser,
  getAllUsers,
  getUserByEmail, 
  deleteUserByEmail,
  // PGN games' methods to deal with the pgn games associated with the user.
  // So there are no changes in the PgnSchema collection, only in the UserSchema collection.wss
  getAllAssociatedGamesByUserEmail,
  getGameByPgnIdAndUserEmail,
  addGameByPgnIdAndUserEmail,
  deleteGameByPgnIdAndUserEmail,
  deleteAllGamesByUserEmail
};