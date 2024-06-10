const fs = require("fs").promises;
const path = require("path");

const {
  addPgnToDBImpl,
  getPgnByPgnIdImpl,
  updatePgnByPgnIdImpl,
} = require("./pgnController");
const initLoggingEngine = require("./loggingEngine");

const stockfishPath = path.resolve(
  "/home/reagan/Desktop/Juris_Chess_Sanctuary_Backend/engines/stockfish/stockfish-ubuntu-x86-64-sse41-popcnt"
);

const FENstartposition =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const doesExist = async (filePath) => {
  try {
    await fs.access(filePath, fs.constants.F_OK);
  } catch (err) {
    throw new Error(`File ${filePath} does not exist.`);
  }
};

const isExecutable = async (filePath) => {
  try {
    await fs.access(filePath, fs.constants.X_OK);
  } catch (err) {
    throw new Error(`File ${filePath} is not executable.`);
  }
};

const sendLogUpdateReceived = (data) => {
  clients.forEach((client) =>
    client.res.write(
      `event: message\nid: ${Date.now()}\ndata: ${JSON.stringify(data)}\n\n`
    )
  );
};

const sendLogUpdateSent = (data) => {
  clients.forEach((client) =>
    client.res.write(
      `event: message\nid: ${Date.now()}\ndata: ${JSON.stringify(data)}\n\n`
    )
  );
};

let stockfish;

const initEngine = async (req, res) => {
  console.log("STARTING INIT ENGINE");
  try {
    await doesExist(stockfishPath);
    await isExecutable(stockfishPath);
    console.log("STOCKFISH INSIDE INIT");
    if (!stockfish) {
      const LoggingEngine = await initLoggingEngine();
      stockfish = await LoggingEngine.start(
        stockfishPath,
        true,
        true,
        true,
        sendLogUpdateSent,
        sendLogUpdateReceived
      );

      stockfish.position();
      await stockfish.isready();
      res
        .status(200)
        .json({ status: "Stockfish engine initialized and ready to use." });
    } else {
      res
        .status(200)
        .json({ status: "Stockfish engine is already initialized." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const quitEngine = async (req, res) => {
  try {
    if (!stockfish) {
      return res
        .status(500)
        .json({ error: "Stockfish engine is not initialized." });
    }

    await stockfish.quit();
    stockfish = null;

    res.status(200).json({ status: "Stockfish terminated successfully." });
  } catch (error) {
    console.error("Failed to quit:", error);
    res.status(500).json({ error: "Failed to quit", details: error.message });
  }
};

const stopEngine = async (req, res) => {
  try {
    if (!stockfish) {
      return res
        .status(500)
        .json({ error: "Stockfish engine is not initialized." });
    }

    const result = await stockfish.stop(); // How to get the best move?
    res.status(200).json({ status: "Stockfish calculations stopped!" });
  } catch (error) {
    console.error("Failed to stop calculations:", error);
    res
      .status(500)
      .json({ error: "Failed to stop calculations", details: error.message });
  }
};

const makeMove = async (req, res) => {
  try {
    if (!stockfish) {
      return res
        .status(500)
        .json({ error: "Stockfish engine is not initialized." });
    }

    const depth = req.params.depth || 20;
    await stockfish.go({ depth: Number(depth) });
    res.status(200).json({ status: "Move initiated", depth: Number(depth) });
  } catch (error) {
    console.error("Failed to make move:", error);
    res
      .status(500)
      .json({ error: "Failed to make move", details: error.message });
  }
};

const analyze = async (req, res) => {
  try {
    await stockfish.go();
    res.status(200).json({ status: "Analysis started" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const setPosition = async (req, res) => {
  try {
    if (!stockfish) {
      return res
        .status(500)
        .json({ error: "Stockfish engine is not initialized." });
    }

    const fen = req.body.fen || FENstartposition;
    const moves = req.body.moves || [];
    await stockfish.position({ fen, moves });
    res.status(200).json({ status: "Position set successfully" });
  } catch (error) {
    console.error("Failed to set position:", error);
    res
      .status(500)
      .json({ error: "Failed to set position", details: error.message });
  }
};

const setMoves = async (req, res) => {
  try {
    const moves = decodeURIComponent(req.params.moves);

    const components = moves.split(" ");
    let fen = null;
    let moveList = [];
    let invalidMoves = [];

    if (components[0].length > 10) {
      fen = components[0];
      moveList = components.slice(1);
    } else {
      moveList = components;
    }

    if (!fen) {
      fen = FENstartposition;
    }
    moveList.forEach((move) => {
      if (move.length < 4 || move.length > 5) {
        invalidMoves.push(move);
      }
    });

    if (invalidMoves.length > 0) {
      console.log("Invalid moves:", invalidMoves);
    }

    const positionResult = await stockfish.position({ fen, moves: moveList });

    res.send(`Received position: ${JSON.stringify(positionResult)}`);
  } catch (error) {
    res.status(400).send(`Error processing moves: ${error.message}`);
  }
};

const loadGame = async (req, res) => {
  const { id } = req.params;
  try {
    const game = await getPgnByPgnIdImpl(id);
    if (game) {
      res.status(200).json({ game });
    } else {
      res.status(404).json({ error: "Game not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const saveGame = async (req, res) => {
  try {
    const newPgn = await addPgnToDBImpl(req.body);
    res.status(201).json({ status: "Game saved", game: newPgn });
    return newPgn;
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateGame = async (req, res) => {
  const { id } = req.params;
  try {
    const game = await updatePgnByPgnIdImpl(id, req.body);
    if (game) {
      res.status(200).json({ game });
    } else {
      res.status(404).json({ error: "Game not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

let clients = [];
const sse = (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // flush the headers to establish SSE connection

    const clientId = Date.now();
    const newClient = {
      id: clientId,
      res,
    };

    clients.push(newClient);

    req.on("close", () => {
      console.log("SSE CONNECTION CLOSED");
      clients = clients.filter((client) => client.id !== clientId);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  initEngine,
  quitEngine,
  stopEngine,
  analyze,
  setPosition,
  setMoves,
  makeMove,
  saveGame,
  loadGame,
  updateGame,
  sse,
};
