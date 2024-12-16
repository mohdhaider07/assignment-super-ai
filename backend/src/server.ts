import express, { Request, Response } from "express";
import multer from "multer";
import DuckDB from "duckdb";
import OpenAI from "openai";

import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
const client = new OpenAI();
client.apiKey = process.env.OPENAI_API_KEY || "";
// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// DuckDB setup
const db = new DuckDB.Database(":memory:");
let connection: DuckDB.Connection;
try {
  connection = db.connect();
  console.log("Connected to DuckDB");
} catch (err) {
  console.error("Failed to connect to DuckDB", err);
}

const executeQuery = (sqlQuery: string) => {
  return new Promise((resolve, reject) => {
    connection.all(sqlQuery, (err, res) => {
      if (err) {
        console.warn("query error", err);
        reject(err);
      } else {
        console.log("query result", res.length);
        // Convert BigInt values to strings
        const sanitizedResult = res.map((row: any) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              typeof value === "bigint" ? value.toString() : value,
            ])
          )
        );
        resolve(sanitizedResult);
      }
    });
  });
};

let tableName = "";

// Route: Health Check
app.get("/", async (req: Request, res: Response) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: "Write a haiku about recursion in programming.",
        },
      ],
    });

    console.log("response", response);

    res.status(200).json({ response });
  } catch (err) {
    console.log("error", err);
    res.status(500).json({ error: "Failed to process query" });
  }
});

// Route: Upload CSV
app.post("/upload", upload.single("file"), async (req: Request, res: any) => {
  console.log("========== Upload Route=============");

  // console.log("Req body ", req.body);
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  console.log("Uploaded file e1:", req.file);

  console.log("Uploaded file e2:", req.file.originalname);

  const filePath = req.file.path;
  tableName = `uploaded_data_${Date.now()}`;

  console.log("file path", filePath);

  try {
    connection.run(
      `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath}')`
    );
    for (let i = 0; i < 10; i++) {
      connection.run(`INSERT INTO ${tableName} SELECT * FROM ${tableName}`);
    }

    res.status(200).json({
      message: "File uploaded and table created successfully",
      tableName,
    });
  } catch (err) {
    console.error("Error loading CSV into DuckDB", err);
    res.status(500).json({ error: "Failed to load CSV into database" });
  }
});

// Route: Query Data
app.post("/query", async (req: Request, res: any) => {
  console.log("========== Query Route=============");
  const { naturalLanguageQuery } = req.body;

  // console.log("table name ", tableName);

  if (!tableName) {
    return res
      .status(400)
      .json({ error: "No table available. Please upload a CSV first." });
  }

  try {
    // Convert natural language to SQL using OpenAI
    // const prompt = `
    //   Convert the following natural language query into SQL for DuckDB:
    //   Table name: ${tableName}
    //   Query: "${naturalLanguageQuery}"
    // `;

    // console.log("Prompt:", prompt);

    // const response = await client.chat.completions.create({
    //   messages: [
    //     {
    //       role: "user",
    //       content:
    //         "Convert natual language to sql query for DuckDB this is this is the query : " +
    //         naturalLanguageQuery,
    //     },
    //   ],
    //   model: "gpt-4o-mini",
    // });

    // const sqlQuery = aiResponse.data.choices[0].text?.trim();
    // query to get all the data
    const sqlQuery = `SELECT * FROM ${tableName} limit 10`;

    if (!sqlQuery) {
      return res.status(500).json({ error: "Failed to generate SQL query" });
    }

    console.log("Generated SQL query:", sqlQuery);

    // Execute SQL query on DuckDB
    const result: any = await executeQuery(sqlQuery);

    // console.log("e5 query", result);

    res.status(200).json({ query: sqlQuery, result, length: result.length });
  } catch (err) {
    console.error("Error processing query", err);
    res.status(500).json({ error: "Failed to process query" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
