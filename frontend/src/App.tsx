import React, { useState, useEffect } from "react";
import axios from "axios";

interface QueryResult {
  query: string;
  result: Array<Record<string, string | number | null>>;
  length: number;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [queryFile, setQueryFile] = useState<string>("");
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [query, setQuery] = useState<string>("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch available files on component mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get("http://localhost:3000/files");
        setAvailableFiles(response.data.files);
        if (response.data.files.length > 0) {
          // Set the first file as the default selected file
          setQueryFile(response.data.files[0]);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };
    fetchFiles();
  }, []);

  // Handle file selection for querying
  const handleQueryFileChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setQueryFile(e.target.value);
  };

  // Handle file input change for upload
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
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert(response.data.message);

      // Refresh the list of available files after upload
      const filesResponse = await axios.get("http://localhost:3000/files");
      setAvailableFiles(filesResponse.data.files);
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during file upload.");
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

    if (!queryFile) {
      alert("Please select a file to query.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:3000/query", {
        naturalLanguageQuery: query,
        tableName: queryFile.replace(".csv", ""),
      });
      setResult(response.data);
    } catch (error) {
      console.error("Query error:", error);
      alert("An error occurred while processing the query.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start p-4">
      {/* Page Header */}
      <header className="w-full max-w-5xl mt-6 mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          DuckDB Query Interface
        </h1>
        <p className="text-gray-600 text-lg">
          Upload your CSV file and query it using natural language.
        </p>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl p-6 space-y-8">
        {/* File Upload Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Upload CSV File
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleUpload}
              disabled={loading}
              className={`px-4 py-2 text-white font-medium rounded-lg shadow ${
                loading
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        {/* File Selection for Query */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Select File to Query
          </h2>
          <select
            value={queryFile}
            onChange={handleQueryFileChange}
            className="block w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableFiles.length > 0 ? (
              availableFiles.map((fileName) => (
                <option key={fileName} value={fileName}>
                  {fileName}
                </option>
              ))
            ) : (
              <option value="">No files available</option>
            )}
          </select>
        </div>

        {/* Query Input Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Run Query
          </h2>
          <textarea
            placeholder="Enter your natural language query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-28 border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          ></textarea>
          <button
            onClick={handleQuery}
            disabled={loading}
            className={`mt-4 px-4 py-2 text-white font-medium rounded-lg shadow ${
              loading
                ? "bg-green-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {loading ? "Processing..." : "Run Query"}
          </button>
        </div>

        {/* Results Section */}
        {result && result.result.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Query Results
            </h2>
            <div className="overflow-auto">
              <table className="min-w-full bg-white border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                    {Object.keys(result.result[0]).map((key) => (
                      <th key={key} className="py-2 px-3 border-b">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.result.map((element, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-100 text-gray-700 text-sm"
                    >
                      {Object.values(element).map((value, index) => (
                        <td key={index} className="py-2 px-3 border-b">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {result && result.result.length === 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No Results Found
            </h2>
            <p className="text-gray-600">
              Your query did not return any results. Please try a different
              query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;