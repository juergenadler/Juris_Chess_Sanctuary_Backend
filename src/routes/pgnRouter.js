//
// pgnRouter.js
//

const express = require('express');
const router = express.Router();

const {
  getAllPgns,
  getPgnByPgnId,
  importPgnToDb,
  addPgnToDB,
  deletePgnByPgnId,
  updatePgnByPgnId,
  uploadPgnFile,
  upload
} = require("../controllers/pgnController");

// GET: getAllPgns. This route fetches all PGN records
router.get('/pgns/getallpgns', getAllPgns);

// POST: importPgnToDb. This route opens a file dialog to upload a PGN file
// upload.single("pgnfile") is a middleware that processes the file upload (-> multer)
router.post('/pgns/importpgn', upload.single("pgnfile"), uploadPgnFile);

// POST: addPgnToDB. This route adds PgnSchema instance to the database via the request body
router.post('/pgns/addpgn', addPgnToDB);

// GET: getPgnByPgnId. This route fetches a PGN by pgn_id
router.get('/pgn/:pgn_id', getPgnByPgnId);

// DELETE: delete a PGN by pgn_id, using the request parameters
router.delete('/pgn/:pgn_id', deletePgnByPgnId);

// PUT: update a PGN by pgn_id, using the request parameters and the request body for updated data
router.put('/pgn/:pgn_id', updatePgnByPgnId);

module.exports = router;
