//
// pgnRouter.js
//

const express = require('express');
const router = express.Router();

const {
  getPgnCount,
  getAllPgns,
  getAllPgnsPaginated,
  getAllPgnByFields,
  getPgnByPgnId,
  addPgnToDB,
  deletePgnByPgnId,
  updatePgnByPgnId,
  uploadPgnFile,
  upload
} = require("../controllers/pgnController");

// GET: Route to get the count of PGNs
router.get('/pgns/count', getPgnCount);

// GET: getAllPgns. This route fetches all PGN records - and should be used with caution!
// This route is for testing purposes only and should be disabled in production. 
// REVIEW: This route should be protected by a middleware that checks the user's role.
router.get('/pgns/getallpgns', getAllPgns);

// GET: getAllPgnsPaginated. This route fetches all PGN records paginated
// Route to get paginated list of PGNs. The page and limit query parameters are optional.
// Example: /pgns/getallpgnspaginated?page=1&limit=30.
// The default limit is 10, and the default page is 1.
router.get('/pgns/getallpgnspaginated', getAllPgnsPaginated);

// GET: getAllPgnByFields. This route fetches all PGN fields.
// Route to get all PGN fields. 
router.get('/pgns/fields/:fields', getAllPgnByFields);

// POST: importPgnToDb. This route opens a file dialog to upload a PGN file
// upload.single("pgnfile") is a middleware that processes the file upload (-> multer)
router.post('/pgns/importpgn', upload.single("pgnfile"), uploadPgnFile);

// POST: addPgnToDB. 
// This route adds a PgnSchema instance to the database via the request body
router.post('/pgns/addpgn', addPgnToDB);

// GET: getPgnByPgnId. This route fetches a PGN by pgn_id
router.get('/pgn/:pgn_id', getPgnByPgnId);

// DELETE: delete a PGN by pgn_id, using the request parameters
router.delete('/pgn/:pgn_id', deletePgnByPgnId);

// PUT: update a PGN by pgn_id, using the request parameters and the request body for updated data
router.put('/pgn/:pgn_id', updatePgnByPgnId);

module.exports = router;
