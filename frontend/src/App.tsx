import React, { useState } from "react";
import axios from "axios";

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState<string>("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3000/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      alert(response.data.message);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload the file.");
    } finally {
      setLoading(false);
    }
  };

  // Handle query submission
  const handleQuery = async () => {
    if (!query) {
      alert("Please enter a natural language query.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:3000/query", {
        naturalLanguageQuery: query,
      });
      setResult(response.data);
    } catch (error) {
      console.error("Query error:", error);
      alert("Failed to process the query.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>DuckDB CSV Upload and Query</h1>

      {/* File Upload Section */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Upload CSV</h2>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{ marginLeft: "10px" }}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Query Section */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Query Data</h2>
        <textarea
          placeholder="Enter your natural language query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", height: "100px" }}
        />
        <button
          onClick={handleQuery}
          disabled={loading}
          style={{ marginTop: "10px" }}
        >
          {loading ? "Processing..." : "Run Query"}
        </button>
      </div>

      {/* Query Results Section */}
      {result && (
        <div>
          <h2>Query Results</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
