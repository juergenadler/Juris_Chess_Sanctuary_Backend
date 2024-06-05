//
// pgnSchema.js
//

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { validate: isUuid, v4: uuidv4 } = require('uuid'); // Import v4 for UUID generation


// Basic PGN validation function (checks for non-empty string)
const validatePgnContent = (pgn) => {
  return typeof pgn === 'string' && pgn.trim().length > 0;
};

// Default values for the "Seven Tag Roster"
const defaultEvent = 'Unknown Event';
const defaultSite = 'Unknown Site';
const defaultDate = "";
const defaultRound = '1';
const defaultWhite = 'Unknown';
const defaultBlack = 'Unknown';
const defaultResult = '*';

// The PGN Schema, as described in
// http://www.saremba.de/chessgml/standards/pgn/pgn-complete
// and
// https://github.com/fsmosca/PGN-Standard/blob/master/PGN-Standard.txt
// We take the "Seven Tag Roster" as mandatory fields to be able to categorize the games, also for searching
// and sorting purposes.

const pgnSchema = new Schema({

  pgn_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true
  },

  // What follows here are the so called "Seven Tag Roster"
  // https://en.wikipedia.org/wiki/Portable_Game_Notation#The_Seven_Tag_Roster
  // They must be there in PGN export format, but we cannot expect them to be there in PGN files we
  // find and load from the internet.
  //
  // 1) Event: Name of the tournament or match event.
  event: {
    type: String,
    default: defaultEvent
  },
  // 2) Site: Location of the event.
  site: {
    type: String,
    default: defaultSite
  },
  // 3) Date: (Starting) Date of the game. in YYYY.MM.DD form.?? is used for unknown values.
  date: {
    type: String,
    default: defaultDate,
    index: true
  },
  // 4) Round: Playing round ordinal of the game.
  round: {
    type: String,
    default: defaultRound
  },
  // 5) White: Player of the white pieces, in order "last name, first name".
  white: {
    type: String,
    default: defaultWhite,
    index: true
  },
  // 6) Black: Player of the black pieces, same format as White.
  black: {
    type: String,
    default: defaultBlack,
    index: true
  },
  // 7) Result: Result of the game. 1-0, 0-1, 1/2-1/2, or * (for ongoing games, e.g., games in progress or games where the result is unknown).
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', '*'],
    default: defaultResult,
    index: true
  },
  // The PGN for this game as it is, after parsing the uploaded PGN file that may contain more than one game.
  // So we store here what comes out of the parser after splitting the PGN file into individual games.
  // So in the JSON representation of the PGN file, this is the "game" object.
  pgnContent: {
    type: String,
    required: [true, 'pgnContent is required'],
    validate: {
      validator: validatePgnContent,
      message: 'pgnContent field is invalid. It must be a non-empty string.'
    },
    default: '[Event "This game"] *'
  },
  // The moves of the game, as a string. This is game.moves in the JSON representation of the PGN file.
  moves: {
    type: String,
    required: [true, 'moves is required'],
    validate: {
      validator: validatePgnContent,
      message: 'moves field is invalid. It must be a non-empty string.'
    },
    default: '*'
  },
  //
  // As described in
  // http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c9.7
  // we have the values
  // "0" for setup when we start from the initial position;
  // "1" for setup when we start from a position given in the FEN tag.
  setup: {
    type: String,
    default: '0'
  },
  // The FEN (Forsyth-Edwards Notation) tag is used to describe the position of the pieces on the board.
  // It is used in conjunction with the Setup tag.
  // See https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation  
  // for more information.
  FEN: { 
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' // Initial position
  },
  annotations: {
    type: String,
    default: ''
  },
  eco: {
    type: String,
    default: ''
  },
  opening: {
    type: String,
    default: ''
  },
  variation: {
    type: String,
    default: ''
  },
  whiteElo: {
    type: String,
    default: "?"
  },
  blackElo: {
    type: String,
    default: "?"
  },  
  eventDate: {
    type: String,
    default: "?"
  }
},
{
  timestamps: true
});

pgnSchema.index({ white: 1, date: 1 })
pgnSchema.index({ black: 1, date: 1 })
pgnSchema.index({ white: 1, black: 1, date: 1 })


module.exports = mongoose.model('PgnSchema', pgnSchema);
