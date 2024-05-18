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
  } 
});

// Custom static signup method
// (normal function instead of arrow function because we need access to "this")
userSchema.statics.signup = async function (email, password) {

  // Check arguments....
  if (!email || !password) {
    const errorstring = `userSchema:signup: All fields must be filled!`;
    console.log(errorstring);
    throw Error(`All fields must be filled!`);
  }

  // When email address is already in the DB we leave a message and quit.
  const exists = await this.findOne({ email });
  if (exists) {
    throw Error(`Email ${email} is already in use!`);
  }

  // Validation of email address and password...
  // TODO: Investigate validator configuration

  if (!validator.isEmail(email)) {
    throw Error("Email address is not valid");
  }

  if (!validator.isStrongPassword(password)) {
    throw Error(
      "Make sure to use at least 8 characters, one upper case letter, a number and a symbol"
    );
  }

  // Encrypting password...

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  // Create user in DB with email & encrypted password.
  // Score is set to 0. 

  const score = 0;

  const user = await this.create({ email, password: hash, score });

  return user;
};

// static custom login method
// 
userSchema.statics.login = async function (email, password) {

  // Check arguments....
  if (!email || !password) {
    throw Error("All fields must be filled");
  }

  // Check for user in DB...if this does not exist, leave
  const user = await this.findOne({ email });

  if (!user) {
    throw Error("User doesn't exist or incorrect email");
  }

  // Check password...
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw Error("Incorrect password");
  }

  return user;
};

module.exports = mongoose.model("UserSchema", userSchema);