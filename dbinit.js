//
//  dbinit.js
//

const mongoose = require("mongoose");

const connectDB = async () => {
  try {

    // Connecting..
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // The name of the connection is the substring after the last / of the MONGO_URI env variable
    console.log(`MongoDB connected: ${conn.connection.name}`.underline.cyan);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    // We cannot handle this here, so we throw again, hoping ;-) the calling module will do.
    // Reporting alone is not sufficient because we MUST stop when the DB connection fails.
    throw error;
  }
};

module.exports = connectDB;
