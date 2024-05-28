//
// pgnController.js
//

const PgnSchema = require('../schemas/pgnSchema');
const pgnParser = require('@mliebelt/pgn-parser');
const { validate: isUuid, v4: uuidv4 } = require('uuid'); // Import v4 for UUID generation

// REVIEW: Refactor into middlwware?
const multer = require('multer');
const fs = require('fs');

//
// INTERNAL: _getNumberOfGamesFromPGN (Helper function)
//
const _getNumberOfGamesFromPGN = (pgn) => {
  try {
    // Parse the PGN string
    const parsedGames = pgnParser.parse(pgn);

    // Return the number of parsed games
    return parsedGames.length;
  } catch (error) {
    // If there's an error parsing the PGN, return -1
    console.error('Error parsing PGN:', error);
    return -1;
  }
};

//
// Multer setup
// Base directory for file uploads is the projects root directory
// If the 'uploads' directory does not exist, create it.
// Only files placed in the 'uploads' directory will be accepted for upload.
//
// In Postman, use the 'form-data' option to upload a file and a post request.
// In the form-data, set the key to 'pgnfile' and the value to the PGN file you want to upload.
// 
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer storage configuration
//
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

// Multer file filter configuration
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/octet-stream' || file.originalname.endsWith('.pgn')) {
    cb(null, true);
  } else {
    cb(new Error("Only PGN files are allowed"), false);
  }
};

//
// Multer middleware for file upload
//
const upload = multer({ storage: storage, fileFilter: fileFilter });


//
// POST: uploadPgnFile
// 
const uploadPgnFile = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Read the uploaded file
    fs.readFile(filePath, 'utf8', async (err, fileContent) => {
      if (err) {
        return res.status(500).json({ message: 'Error reading file' });
      }

      // Parse the PGN content
      let parsedGames;
      try {
        parsedGames = pgnParser.parse(fileContent);
      } catch (parseError) {
        console.error('Error parsing PGN:', parseError);
        return res.status(400).json({ message: 'Error parsing PGN data' });
      }

      // Initialize arrays to store saved and failed games
      const savedGames = [];
      const failedGames = [];

      // Process each parsed game
      for (const game of parsedGames) {
        try {
          // Construct game data object
          const gameData = {
            pgn_id: uuidv4(),
            // Extracted tags
            event: game.tags.Event || 'Unknown Event',
            site: game.tags.Site || 'Unknown Site',
            date: (game.tags.Date?.value || game.tags.Date) || 'Unknown Date',
            round: game.tags.Round || '1',
            white: game.tags.White || 'Unknown',
            black: game.tags.Black || 'Unknown',
            result: game.tags.Result || '*',
            // Additional properties
            pgnContent: JSON.stringify(game, null, 0),
            moves: JSON.stringify(game.moves, null, 0),
            setup: game.tags.Setup || '0',
            FEN: game.tags.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            annotations: '',
            eco: game.tags.ECO || '',
            opening: game.tags.Opening || '',
            variation: game.tags.Variation || '',
            whiteElo: game.tags.WhiteElo || '',
            blackElo: game.tags.BlackElo || '',
            whiteRatingDiff: game.tags.WhiteRatingDiff || '',
            blackRatingDiff: game.tags.BlackRatingDiff || '',
            eventDate: (game.tags.EventDate?.value || game.tags.EventDate) || 'Unknown Date'
          };

          // Save the game to the database
          const pgnRecord = new PgnSchema(gameData);
          const savedGame = await pgnRecord.save();
          console.log(`Record with pgn_id ${gameData.pgn_id} successfully created`);
          savedGames.push(savedGame);
        } catch (saveError) {
          failedGames.push({ game, error: saveError.message });
          console.error(saveError.message);
        }
      } // End of for loop

      // Log processing summary
      console.log(`PGN processing completed. Saved games: ${savedGames.length}, Failed games: ${failedGames.length}, Total games: ${parsedGames.length}`);

      // Send response
      res.status(201).json({ message: 'PGN processing completed', savedGames, failedGames, totalGames: parsedGames.length });
    });
  } catch (error) {
    // Catch any synchronous errors
    console.error('Error in uploadPgnFile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


//
// POST: addPgnToDB
//
// Summary: Uses req.body to add a PGN to the database
// Test: With Postman or curl. Details: Ask ChatGPT ;-)
// This function can be used to add a PGN to the database using the request body.
// Actually the easier way is to use the uploadPgnFile function ;-)
// 
const addPgnToDB = async (req, res) => {
  try {
    const newPgn = new PgnSchema(req.body);

    await newPgn.save();
    res.status(201).json({ message: 'PGN added successfully', pgn: newPgn });
  } catch (error) {
    res.status(400).json({ message: 'Error adding PGN', error: error.message });
  }
};

//
// DELETE: deletePgn
//
// Summary: Deletes a PGN via pgn_id from the database using the request parameters
// 
const deletePgnByPgnId = async (req, res) => {
  try {
    const { pgn_id } = req.params;

    // Validate UUID format
    if (!isUuid(pgn_id)) {
      return res.status(400).json({ message: 'Invalid pgn_id format in deletePgnByPgnId' });
    }

    const deletedPgn = await PgnSchema.findOneAndDelete({ pgn_id });

    if (!deletedPgn) {
      return res.status(404).json({ message: 'PGN not found' });
    }

    res.status(200).json({ message: 'PGN deleted successfully', pgn: deletedPgn });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting PGN', error: error.message });
  }
};

//
// PUT: updatePgnByPgnId
//
// Summary: Updates a PGN via pgn_id in the database using the request parameters, 
// using the request body for the updated data
// 
const updatePgnByPgnId = async (req, res) => {
  try {
    const { pgn_id } = req.params;

    // Validate UUID format
    if (!isUuid(pgn_id)) {
      return res.status(400).json({ message: 'Invalid pgn_id format in updatePgnByPgnId' });
    }

    const updatedPgn = await PgnSchema.findOneAndUpdate(
      { pgn_id },
      req.body,
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    if (!updatedPgn) {
      return res.status(404).json({ message: 'PGN not found' });
    }

    res.status(200).json({ message: 'PGN updated successfully', pgn: updatedPgn });
  } catch (error) {
    res.status(400).json({ message: 'Error updating PGN', error: error.message });
  }
};

//
// GET: getPgnCount
//
// Get the total number of PGN records in the database
// Background: Decide when to introduce pagination.
const getPgnCount = async (req, res) => {
  try {
    const count = await PgnSchema.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(400).json({ message: 'Error fetching PGN count', error: error.message });
  }
};


//
// GET: getAllPgns
//
// get all PGN records. No limit set. Use with caution!
//
const getAllPgns = async (req, res) => {
  try {
    const pgns = await PgnSchema.find();
    res.status(200).json(pgns);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching PGNs', error: error.message });
  }
};

//
// GET: getAllPgnsPaginated
// Improved version of getAllPgns with pagination
//
const getAllPgnsPaginated = async (req, res) => {
  try {
    // Set the limit of items to return per page, default to 10 if not provided
    const limit = parseInt(req.query.limit) || 10;

    // Extract the page number from the query parameters, default to 1 if not provided
    const page = parseInt(req.query.page) || 1;

    // Calculate the number of documents to skip based on the page and limit
    const skip = (page - 1) * limit;

    // Fetch the paginated results from the database
    const pgns = await PgnSchema.find().skip(skip).limit(limit);

    // Count total number of documents in the collection
    const total = await PgnSchema.countDocuments();

    // Calculate the total number of pages based on the total number of documents and the limit
    const totalPages = Math.ceil(total / limit);

    // Return paginated results along with metadata
    res.status(200).json({
      page,
      limit,
      total,
      totalPages,
      data: pgns,
      message: `Paginated list of PGNs fetched successfully. Page ${page} of ${totalPages}, showing ${pgns.length} out of ${total} records.`
    });
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(400).json({ message: 'Error fetching paginated PGNs', error: error.message });
  }
};

//
// GET: getAllPgnFields
//
// Summary: Fetches all PGN fields according to the fields parameter in the URL
// Example: In the browser, navigate to http://localhost:7000/sanctuary/pgnrouter/pgns/fields/pgn_id%20white%20black%20date
// This will return all (!!) PGN records with only the pgn_id, white, black, and date fields.
// Handle with care!
// Notes:
// 1) Express handles decoding URL parameters automatically
// 2) When you want to dynamically specify fields based on a string input, you need to construct a projection object to pass to the find() method.
// The projection object specifies which fields to include or exclude in the query result.
// It's necessary because Mongoose requires the fields to be specified as an object when using dynamic field selection.
// Here's why the projection object is necessary when dynamically selecting fields://
// 1) Dynamic Field Selection: When the fields to retrieve are specified dynamically as a string, you need to convert that string into an object to pass it to the find() method.Mongoose expects the fields to be provided in this object format for dynamic selection.
// 2) Projection: The projection object tells MongoDB which fields to include or exclude from the query result.By specifying the fields in the projection object, you control which fields are returned in the query result, providing flexibility and optimization.
// While the projection object adds a step in constructing the query, it allows for dynamic field selection and provides fine - grained control over the fields returned from the database.
const getAllPgnFields = async (req) => {
  try {
    let projection = {}; 

    // Check if the 'fields' parameter exists in the request parameters
    if (!req.params.fields || typeof req.params.fields !== 'string') {
      throw new Error('Fields parameter is missing or invalid');
    }

    const fields = req.params.fields.trim(); // Get the fields parameter from the URL and remove leading/trailing spaces

    // If fields are specified, split the fields string into an array of field names
    const fieldArray = fields.split(' ');

    // Check if any of the field names are empty after splitting
    if (fieldArray.some(field => field.trim().length === 0)) {
      throw new Error('One or more field names are invalid');
    }

    // Create the projection object based on the specified field names
    projection = fieldArray.reduce((acc, field) => {
      acc[field] = 1; // Include the field in the projection
      return acc;
    }, {});

    // Fetch PGN documents with specified fields
    const pgns = await PgnSchema.find({}, projection);
    return pgns;
  } catch (error) {
    throw new Error(`Error fetching PGN fields: ${error.message}`);
  }
};



//
// GET: getPgnByPgnId
//
// Get a PGN by pgn_id from the database using the request parameters
// 
const getPgnByPgnId = async (req, res) => {
  try {
    const { pgn_id } = req.params;

    // Validate UUID format
    if (!isUuid(pgn_id)) {
      return res.status(400).json({ message: 'Invalid pgn_id format in getPgnByPgnId' });
    }

    const pgn = await PgnSchema.findOne({ pgn_id });

    if (!pgn) {
      return res.status(404).json({ message: 'PGN not found' });
    }

    res.status(200).json(pgn);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching PGN', error: error.message });
  }
};



module.exports = {
  getPgnCount,
  getAllPgns,
  getAllPgnsPaginated,
  getAllPgnFields,
  getPgnByPgnId,
  addPgnToDB,
  deletePgnByPgnId,
  updatePgnByPgnId,
  uploadPgnFile,
  upload
};
