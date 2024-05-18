//
// userController.js
//

const UserSchema = require("../schemas/UserSchema");
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
// place these values in the request BODY, not as a query!! 
// 
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



module.exports = {
  loginUser,
  signUpUser,
  getAllUsers,
  getUserByEmail, 
  deleteUserByEmail
};