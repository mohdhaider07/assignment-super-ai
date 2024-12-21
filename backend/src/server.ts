import express, { Request, Response } from "express";
import multer from "multer";
import DuckDB from "duckdb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import getSQLQuery from "./utils";
// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer setup for file uploads

const storageConfig = multer.diskStorage({
  destination: path.join(__dirname, "uploads/"),
  filename: (req, file, res) => {
    res(
      null,
      file.originalname.replace(".csv", "").replace(/[^a-zA-Z0-9_]/g, "") +
        ".csv"
    );
  },
});

const upload = multer({ storage: storageConfig });

// DuckDB setup
const db = new DuckDB.Database("./src/database/db.csv");
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
        return reject(err);
      } else {
        // console.log("query result", res.length);
        // Convert BigInt values to strings
        const sanitizedResult = res.map((row: any) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              typeof value === "bigint" ? value.toString() : value,
            ])
          )
        );
        return resolve(sanitizedResult);
      }
    });
  });
};

// Route: Health Check
// app.get("/", async (req: Request, res: Response) => {
//   try {
//     const response = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You are a helpful assistant." },
//         {
//           role: "user",
//           content: "Say hello to the world.",
//         },
//       ],
//     });

//     console.log("response", response);

//     res.status(200).json({ response });
//   } catch (err) {
//     console.log("error", err);
//     res.status(500).json({ error: "Failed to process query" });
//   }
// });

// Route: Upload CSV
app.post("/upload", upload.single("file"), async (req: Request, res: any) => {
  console.log("========== Upload `Route`=============");

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("req.file", req.file);

  const tableName = req.file.originalname
    .replace(".csv", "")
    .replace(/[^a-zA-Z0-9_]/g, "");

  const filePath = path.join(__dirname, `./uploads/${tableName}.csv`);

  console.log("file path", filePath);
  console.log("table name", tableName);

  try {
    // check if table already exists
    const tableExists: any = await executeQuery(
      `SELECT * FROM information_schema.tables WHERE table_name = '${tableName}'`
    );
    console.log("tableExists", tableExists);
    if (tableExists.length > 0) {
      return res.status(200).json({ message: "File already uploaded" });
    }

    const result = await executeQuery(
      `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath}')`
    );
    // console.log("result", result);

    return res.status(200).json({
      message: "File uploaded and table created successfully",
      tableName,
      result,
    });
  } catch (err) {
    console.error("Error loading CSV into DuckDB", err);
    res.status(500).json({ error: "Failed to load CSV into database" });
  }
});

// Route: Query Data
app.post("/query", async (req: Request, res: any) => {
  console.log("========== Query Route=============");
  let { naturalLanguageQuery, tableName } = req.body;

  tableName=tableName.replace(".csv", "").replace(/[^a-zA-Z0-9_]/g, "")

  if (!tableName) {
    return res.status(400).json({ error: "Please select the file" });
  }


  // load data into db from file superstore.csv and path is ./uploads
  const filePath = path.join(__dirname, `./uploads/${tableName}.csv`);
  console.log("file path", filePath);

  const tableExists: any = await executeQuery(
    `SELECT * FROM information_schema.tables WHERE table_name = '${tableName}'`
  );
  console.log("tableExists", tableExists);
  // if table not exist create the table
  if (tableExists.length == 0) {
    await executeQuery(
      `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${filePath}', ignore_errors=true)`
    );
  }

  const columns: any = await executeQuery(`
    SELECT column_name , data_type
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
  `);

  console.log("columns=>", columns);
  const allColumns = columns.map(
    (item: any) => item.column_name + ", " + item.data_type
  );
  console.log("all columns=>", allColumns);
  if (!allColumns || allColumns.length === 0) {
    console.log("No columns available in the table.");
    return res
      .status(400)
      .send({ error: "No columns available in the table." });
  }


  const prompt = `You are an assistant that converts natural language queries into SQL queries specifically for DuckDB.
The table name is "${tableName}", and the columns are: ${allColumns}.
Your response must be only a JSON object: {"sql": "SQL query here"}.
Do not include any code fences, language labels, explanations, or additional text—just the JSON object with the SQL query.`;

  try {
    const response = await getSQLQuery({ naturalLanguageQuery, prompt });

    // Execute SQL query on DuckDB
    const query = response.candidates[0].content.parts[0].text.replace(/```(?:\w+)?\n([\s\S]*?)\n```/, '$1').trim();
    console.log("query=>", query);
    const cleanQuery = JSON.parse(query);

    console.log("cleanQuery=>", cleanQuery);

    // const result: any = await executeQuery(`SELECT * FROM ${tableName}`);
    const result: any = await executeQuery(cleanQuery.sql);
    // console.log("e5 query", result);

    res.status(200).json({ query: cleanQuery.sql, result, length: result.length });
  } catch (err) {
    console.error("Error processing query", err);
    return res.status(500).json({ error: "Failed to process query" });
  }
});

// get all files name from uploads folder
app.get("/files", async (req: Request, res: any) => {
  const files = fs.readdirSync(path.join(__dirname, "./uploads"));
  
  res.status(200).json({ files });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
