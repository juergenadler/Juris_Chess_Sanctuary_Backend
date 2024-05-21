//
// pgnSchema.js
//

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

// Basic moves validation function (checks for non-empty string)
const validateMoves = (moves) => {
  return typeof moves === 'string' && moves.trim().length > 0;
};

//
// 1) We cannot expect PGN files we find and load from the internet to be valid or validated.
// So the "require" attribute for
//
// event, site, date, round, white, black, result
//
// as requested by the specs
// does not make sense here, because we might not to able to provide the missing data anyway.
// On the other hand we can provide data and validate for games we create.
// So we provide default values for the missing fields as practicable solution.
// 2) "moves"" might be validated later. As it can also contain comments we cannot just check for stuff
// like so:
// const movesPattern = /^[a-h1-8KQRBNkqrbnO\-0x\+\=\#\.\s]+$/;
// return moves && moves.length > 0 && movesPattern.test(moves);
// 3) It is also to early to check for the proper move numbers within "moves"
//

const pgnSchema = new Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  event: {
    type: String,
    default: 'Unknown Event'
  },
  site: {
    type: String,
    default: 'Unknown Site'
  },
  date: {
    type: Date,
    default: Date.now
  },
  round: {
    type: String,
    default: '1'
  },
  white: {
    type: String,
    default: 'Unknown'
  },
  black: {
    type: String,
    default: 'Unknown'
  },
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', '*'],
    default: '*'
  },
  moves: {
    type: String,
    required: [true, 'Moves are required'],
    validate: {
      validator: validateMoves,
      message: 'Moves field is invalid. It must be a non-empty string.'
    }
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
    type: Number,
    default: null
  },
  blackElo: {
    type: Number,
    default: null
  },
  whiteRatingDiff: {
    type: Number,
    default: null
  },
  blackRatingDiff: {
    type: Number,
    default: null
  },
  eventDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PgnSchema', pgnSchema);
