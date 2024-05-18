//
// userRouter.js
//

const express = require("express");
const router = express.Router();

const {
  loginUser,
  signUpUser,
  getAllUsers,
  getUserByEmail,  
  deleteUserByEmail
} = require("../controllers/userController");

// In our implementation the following paths stacks up to the mount path being defined 
// earlier via app.use("/user", userRouter);
// Example: http://localhost:PORT/user/login

// Login (POST)
// 
router.post("/login", loginUser);

// Signup (POST) = Add user
// 
router.post("/signup", signUpUser);

// getAllUsers (GET)
// 
router.get("/users", getAllUsers);

// getUserByEmail (GET)
// 
router.get("/users/:email", getUserByEmail);

// deleteUserByEmail (DELETE)
// 
router.delete("/users/:email", deleteUserByEmail);

module.exports = router;