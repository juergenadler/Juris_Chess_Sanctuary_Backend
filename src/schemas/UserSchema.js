//
//  UserSchema.js
//

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");


const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  // Relation user -> pgn is 1 : many. This is maintained as an array of pgnSchema objects
   // Do not import the PgnSchema here, as it will create a circular dependency!
  pgngames: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PgnSchema' }]

});

// Custom static signup method
// (normal function instead of arrow function because we need access to "this")
userSchema.statics.signup = async function (email, password) {
  try {
    // Check arguments
    if (!email || !password) {
      const errorString = 'All fields must be filled!';
      console.error(errorString);
      throw new Error('All fields must be filled!');
    }

    // When email address is already in the DB we leave a message and quit.
    const exists = await this.findOne({ email });
    if (exists) {
      throw new Error(`Email ${email} is already in use!`);
    }

    // Validation of email address and password
    if (!validator.isEmail(email)) {
      throw new Error('Email address is not valid');
    }

    if (!validator.isStrongPassword(password)) {
      throw new Error('Make sure to use at least 8 characters, one upper case letter, a number, and a symbol');
    }

    // Encrypting password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create user in DB with email & encrypted password
    const user = await this.create({ email, password: hash });
    console.log(`User ${email} successfully created!`)
    return user;

  } catch (error) {
    console.error(`Error occurred: ${error.message}`);
    throw error;
  }
};

//
// static custom login method
// 
userSchema.statics.login = async function (email, password) {
  try {
    // Validate input
    if (!email || !password) {
      throw new Error("All fields must be filled");
    }

    // Check for user in DB
    const user = await this.findOne({ email });
    if (!user) {
      throw new Error("User doesn't exist or incorrect email");
    }

    // Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new Error("Incorrect password");
    }

    return user;
  } catch (error) {
    // Add more detailed error logging if necessary
    console.error(`Login error: ${error.message}`);
    throw error; // Re-throw the error after logging it
  }
};

module.exports = mongoose.model("UserSchema", userSchema);