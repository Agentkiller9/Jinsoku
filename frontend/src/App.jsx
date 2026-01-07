import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { 
  Terminal, CheckCircle, AlertCircle, Server, File, Zap, Loader2, Play, 
  RefreshCw, Info, ArrowRight, Brain, Eye, Code, Table, FileText, List, 
  AlertTriangle, Hash, Users, Activity, LayoutDashboard, Database
} from 'lucide-react';

// Define the API endpoint
const API_URL = 'http://localhost:8000';

// API Client
const apiClient = axios.create({
  baseURL: API_URL,
});

// --- Main App Component (Router) ---
export default function App() {
  // --- Global State ---
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' or 'results'
  const [apiStatus, setApiStatus] = useState(false);
  const [tools, setTools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState('');
  
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('simple'); // 'simple' or 'expert'
  
  // This state is just for the main pipeline
  const [hayabusaReport, setHayabusaReport] = useState(null);

  // --- API Functions ---
  const checkApiHealth = async () => {
    try {
      await apiClient.get('/');
      setApiStatus(true);
    } catch (err) {
      setApiStatus(false);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await apiClient.get('/tools');
      setTools(response.data);
    } catch (err) {
      console.error("Error fetching tools:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await apiClient.get('/logs');
      const validLogs = response.data.filter(log => log !== '.gitkeep' && !log.startsWith('results'));
      setLogs(validLogs);
      
      if (validLogs.length > 0 && !selectedLog) {
        setSelectedLog(validLogs[0]);
      } else if (validLogs.length === 0) {
        setSelectedLog('');
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  // Health check on component mount
  useEffect(() => {
    checkApiHealth();
    fetchTools();
    fetchLogs();
  }, []);

  const runAnalysis = async (tool) => {
    if (tool !== 'takajo' && !selectedLog) {
      setError("Please select a valid log file.");
      setCurrentPage('results'); // Show the error on the results page
      return;
    }
    
    if (tool === 'takajo' && !hayabusaReport) {
      setError("Please run a successful Hayabusa analysis first.");
      setCurrentPage('results');
      return;
    }

    setLoading(true);
    setCurrentTool(tool);
    setResults(null);
    setError(null);
    setCurrentPage('results'); // Switch to results page immediately

    try {
      let response;
      if (tool === 'hayabusa') {
        response = await apiClient.post(`/analyze/hayabusa`, { log_file: selectedLog });
        setHayabusaReport(response.data.output_location);
      } else if (tool === 'chainsaw') {
        response = await apiClient.post(`/analyze/chainsaw`, { log_file: selectedLog });
        setHayabusaReport(null);
      } else if (tool === 'takajo') {
        response = await apiClient.post(`/analyze/takajo`, { hayabusa_report_file: hayabusaReport });
      }
      
      setResults(response.data);

    } catch (err) {
      let errorDetail = err.message;
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorDetail = err.response.data.detail;
        } else if (err.response.data.detail.stderr) {
          errorDetail = err.response.data.detail.stderr;
        } else if (err.response.data.detail.message) {
          errorDetail = err.response.data.detail.message;
        } else {
          errorDetail = JSON.stringify(err.response.data.detail);
        }
      }
      setError(errorDetail);
      setResults(err.response?.data);
      if (tool === 'hayabusa') {
        setHayabusaReport(null);
      }
    } finally {
      setLoading(false);
      setCurrentTool('');
    }
  };

  // --- Render ---
  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="flex-1 p-8 overflow-auto h-screen">
        <Header apiStatus={apiStatus} />
        
        {currentPage === 'dashboard' && (
          <DashboardPage
            tools={tools}
            logs={logs}
            selectedLog={selectedLog}
            setSelectedLog={setSelectedLog}
            onRefresh={fetchLogs}
            onRun={runAnalysis}
            loading={loading}
            currentTool={currentTool}
            hayabusaReport={hayabusaReport}
          />
        )}
        
        {currentPage === 'results' && (
          <ResultsPage
            loading={loading}
            currentTool={currentTool}
            results={results}
            error={error}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}
      </main>
    </div>
  );
}

// --- Navigation ---

function Sidebar({ currentPage, setCurrentPage }) {
  const navItems = [
    { name: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
    { name: 'Results', page: 'results', icon: Database },
  ];

  return (
    <nav className="flex flex-col w-64 bg-gray-800 shadow-lg h-screen sticky top-0">
      <div className="flex items-center space-x-3 p-5 border-b border-gray-700">
        <Terminal className="w-8 h-8 text-blue-400" />
        <h1 className="text-xl font-bold text-white">DFIR Workbench</h1>
      </div>
      <div className="flex-1 p-3 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setCurrentPage(item.page)}
            className={`
              w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                currentPage === item.page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Header({ apiStatus }) {
  return (
    <div className="flex justify-end items-center pb-4 border-b border-gray-700 mb-6">
      <div className="flex items-center space-x-2">
        {apiStatus ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-400" />
        )}
        <span className={`text-sm ${apiStatus ? 'text-green-400' : 'text-red-400'}`}>
          API: {apiStatus ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

// --- Page Components ---

function DashboardPage({
  tools,
  logs,
  selectedLog,
  setSelectedLog,
  onRefresh,
  onRun,
  loading,
  currentTool,
  hayabusaReport
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <ToolStatusCard tools={tools} />
      </div>
      <div className="md:col-span-2 space-y-6">
        <LogFileCard
          logs={logs}
          selectedLog={selectedLog}
          setSelectedLog={setSelectedLog}
          onRefresh={onRefresh}
        />
        <AnalysisControlCard
          onRun={onRun}
          loading={loading}
          currentTool={currentTool}
          disabled={!selectedLog}
          takajoReady={!!hayabusaReport}
        />
      </div>
    </div>
  );
}

function ResultsPage({ loading, currentTool, results, error, viewMode, setViewMode }) {
  return (
    <div className="w-full">
      <ResultsPanel
        loading={loading}
        currentTool={currentTool}
        results={results}
        error={error}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
    </div>
  );
}


// --- Card Components ---

function ToolStatusCard({ tools }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5">
      <div className="flex items-center space-x-2 mb-3">
        <Server className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Tool Status</h2>
      </div>
      <ul className="space-y-2">
        {tools.map(tool => (
          <li key={tool.name} className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{tool.name}</span>
            {tool.exists ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </li>
        ))}
        {tools.length === 0 && <p className="text-sm text-gray-500">Checking...</p>}
      </ul>
      <p className="text-xs text-gray-500 mt-3">Tools must be in their respective `/tools/*` folders.</p>
    </div>
  );
}

function LogFileCard({ logs, selectedLog, setSelectedLog, onRefresh }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <File className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Log File</h2>
        </div>
        <button onClick={onRefresh} className="text-gray-400 hover:text-white transition" title="Refresh log list">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-start space-x-2 bg-gray-900/50 p-3 rounded-md mb-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          This list reads from the `/data` folder. Manually add `.evtx` files to that
          folder, then click Refresh.
        </p>
      </div>
      
      {logs.length > 0 ? (
        <select 
          value={selectedLog}
          onChange={(e) => setSelectedLog(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {logs.map(log => (
            <option key={log} value={log}>{log}</option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-center text-gray-500 py-2">
          No logs found.
        </p>
      )}
    </div>
  );
}

function AnalysisControlCard({ onRun, loading, currentTool, disabled, takajoReady }) {
  const isHayabusaLoading = loading && currentTool === 'hayabusa';
  const isChainsawLoading = loading && currentTool === 'chainsaw';
  const isTakajoLoading = loading && currentTool === 'takajo';

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5">
      <div className="flex items-center space-x-2 mb-3">
        <Zap className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Analysis Pipeline</h2>
      </div>
      <div className="space-y-3">
        {/* --- Hayabusa --- */}
        <button
          onClick={() => onRun('hayabusa')}
          disabled={loading || disabled}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isHayabusaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          <span>1. Run Hayabusa</span>
        </button>

        {/* --- Takajo --- */}
        <div className="flex flex-col items-center">
          <ArrowRight className={`w-5 h-5 my-2 ${takajoReady ? 'text-green-400' : 'text-gray-600'}`} />
          <button
            onClick={() => onRun('takajo')}
            disabled={loading || !takajoReady}
            className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTakajoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
            <span>2. Run Takajo Analysis</span>
          </button>
          {!takajoReady && (
            <p className="text-xs text-gray-500 mt-2">Run Hayabusa first to enable Takajo.</p>
          )}
        </div>
        
        {/* --- Chainsaw (Separate) --- */}
        <div className="border-t border-gray-700 pt-3 mt-3">
          <button
            onClick={() => onRun('chainsaw')}
            disabled={loading || disabled}
            className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChainsawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            <span>Run Chainsaw (Stub)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Results Components ---

function ResultsPanel({ loading, currentTool, results, error, viewMode, setViewMode }) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 min-h-[80vh]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-white">Results</h2>
        
        {/* --- View Mode Toggle --- */}
        <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('simple')}
            className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-md ${
              viewMode === 'simple' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:bg-gray-700'
            } transition-all`}
          >
            <Eye className="w-4 h-4" />
            <span>Simple</span>
          </button>
          <button
            onClick={() => setViewMode('expert')}
            className={`flex items-center space-x-1 px-3 py-1 text-xs rounded-md ${
              viewMode === 'expert' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:bg-gray-700'
            } transition-all`}
          >
            <Code className="w-4 h-4" />
            <span>Expert</span>
          </button>
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center text-gray-400 h-full py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="mt-3 text-lg">Running {currentTool}...</p>
          <p className="text-sm">This may take a moment.</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-300" />
            <h3 className="font-semibold">Analysis Failed</h3>
          </div>
          <pre className="text-sm whitespace-pre-wrap break-all">{error}</pre>
        </div>
      )}

      {/* Success/Data State */}
      {results && !loading && !error && (
        <div className="text-sm">
          <div className="bg-green-900/50 border border-green-700 text-green-200 rounded-md p-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <h3 className="font-semibold">{results.message || "Analysis Complete"}</h3>
            </div>
            {results.output_location && <p className="text-xs mt-1">Report saved to: {results.output_location}</p>}
          </div>
          
          {/* --- CONDITIONAL VIEW --- */}
          {viewMode === 'simple' ? (
            <SimpleView results={results} />
          ) : (
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Expert Mode (Full API Response):</h4>
              <pre className="w-full bg-gray-900 text-gray-300 p-4 rounded-md overflow-x-auto text-xs max-h-[70vh]">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !results && !error && (
        <div className="flex flex-col items-center justify-center text-gray-500 h-full py-20">
          <Terminal className="w-16 h-16 text-gray-600" />
          <p className="mt-3 text-lg">Waiting for analysis</p>
          <p className="text-sm">Select a log file and run a tool to see results.</p>
        </div>
      )}
    </div>
  );
}

function SimpleView({ results }) {
  if (results.tool === 'Takajo') {
    return (
      <TakajoReportViewer results={results} />
    );
  }
  
  // Fallback for other tools (like Hayabusa)
  return (
    <div>
      <h4 className="font-semibold text-gray-300 mb-2">{results.tool} Output (stdout):</h4>
      <pre className="w-full bg-gray-900 text-gray-300 p-4 rounded-md overflow-x-auto text-xs max-h-[70vh]">
        {results.stdout ? results.stdout : "No standard output from this tool."}
      </pre>
    </div>
  );
}

function TakajoReportViewer({ results }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [currentFile, setCurrentFile] = useState(null);

  if (!results.generated_files) {
    return (
      <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 rounded-md p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-300" />
          <h3 className="font-semibold">Takajo ran, but no files were reported.</h3>
        </div>
      </div>
    );
  }
  
  const analysisDir = results.output_location.split('/').pop();

  // Group files for tabs
  const metricsFiles = results.generated_files.filter(f => f.toLowerCase().startsWith('metrics') && f.endsWith('.csv'));
  const timelineFiles = results.generated_files.filter(f => f.toLowerCase().startsWith('timeline') && f.endsWith('.csv'));
  const iocFiles = results.generated_files.filter(f => f.toLowerCase().startsWith('list') && f.endsWith('.txt'));
  const stackFiles = results.generated_files.filter(f => f.toLowerCase().startsWith('stack') && f.endsWith('.csv'));
  
  const tabGroups = [
    { name: 'Summary', key: 'summary', icon: Info, count: 0 },
    { name: 'Metrics', key: 'metrics', icon: Users, count: metricsFiles.length },
    { name: 'Timelines', key: 'timelines', icon: Activity, count: timelineFiles.length },
    { name: 'Stacking', key: 'stacking', icon: List, count: stackFiles.length },
    { name: 'IOCs', key: 'iocs', icon: Hash, count: iocFiles.length },
  ].filter(g => g.key === 'summary' || g.count > 0);

  return (
    <div className="w-full">
      <div className="border-b border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabGroups.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentFile(null); // Reset file view on tab change
              }}
              className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 h-full max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* This is the File List or Summary */}
            {activeTab === 'summary' && <ReportSummary stdout={results.stdout} />}
            {activeTab === 'metrics' && <FileListView files={metricsFiles} onFileClick={setCurrentFile} analysisDir={analysisDir} currentFile={currentFile} />}
            {activeTab === 'timelines' && <FileListView files={timelineFiles} onFileClick={setCurrentFile} analysisDir={analysisDir} currentFile={currentFile} />}
            {activeTab === 'stacking' && <FileListView files={stackFiles} onFileClick={setCurrentFile} analysisDir={analysisDir} currentFile={currentFile} />}
            {activeTab === 'iocs' && <FileListView files={iocFiles} onFileClick={setCurrentFile} analysisDir={analysisDir} currentFile={currentFile} />}
          </div>
          
          <div className="lg:col-span-3">
            {/* This is the File Viewer */}
            {currentFile ? (
              <FileViewer file={currentFile} />
            ) : (
              activeTab !== 'summary' && (
                <div className="flex items-center justify-center h-64 bg-gray-900/50 rounded-lg">
                  <p className="text-gray-500">Select a file to view its contents.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSummary({ stdout }) {
  return (
    <div>
      <h3 className="font-semibold text-white mb-2">Takajo 'automagic' Summary</h3>
      <pre className="w-full bg-gray-900 text-gray-300 p-4 rounded-md overflow-x-auto text-xs max-h-[70vh]">
        {stdout ? stdout : "No summary output."}
      </pre>
    </div>
  )
}

function FileListView({ files, onFileClick, analysisDir, currentFile }) {
  const getIcon = (fileName) => {
    if (fileName.endsWith('.csv')) return <Table className="w-4 h-4 text-green-400" />;
    if (fileName.endsWith('.txt')) return <FileText className="w-4 h-4 text-blue-400" />;
    return <File className="w-4 h-4 text-gray-500" />;
  }

  return (
    <div className="flex flex-col space-y-2">
      <h3 className="font-semibold text-white mb-1">Generated Files</h3>
      {files.map(file => (
        <button
          key={file}
          onClick={() => onFileClick({ name: file, dir: analysisDir, type: file.endsWith('.csv') ? 'csv' : 'txt' })}
          className={`w-full text-left p-2 rounded-md text-sm text-gray-300 transition flex items-center space-x-2 truncate ${
            currentFile?.name === file ? 'bg-blue-600/30' : 'bg-gray-700/50 hover:bg-gray-700'
          }`}
        >
          {getIcon(file)}
          <span className="truncate">{file}</span>
        </button>
      ))}
    </div>
  );
}

function FileViewer({ file }) {
  if (file.type === 'csv') {
    return <CsvTableViewer file={file} />;
  }
  if (file.type === 'txt') {
    return <TxtFileViewer file={file} />;
  }
  return <p>Unsupported file type.</p>;
}

function CsvTableViewer({ file }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCsv = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        // Use URL-safe encoding for directory and file names
        const dir = encodeURIComponent(file.dir);
        const name = encodeURIComponent(file.name);
        const url = `${API_URL}/results_file/${dir}/${name}`;
        
        const response = await apiClient.get(url);
        
        Papa.parse(response.data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results);
          },
          error: (err) => {
            setError(err.message);
          }
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCsv();
  }, [file]);

  return (
    <div className="bg-gray-900 p-4 rounded-lg overflow-hidden">
      <h4 className="font-semibold text-white mb-3 truncate">{file.name}</h4>
      {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
      {error && <p className="text-red-400 text-xs">Error parsing CSV: {error}</p>}
      {data && (
        <div className="overflow-x-auto max-h-[70vh] relative custom-scrollbar">
          <table className="w-full text-xs text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
              <tr>
                {data.meta.fields.map(field => (
                  <th key={field} scope="col" className="py-2 px-3">{field}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((row, i) => (
                <tr key={i} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                  {data.meta.fields.map(field => (
                    <td key={field} className="py-2 px-3 max-w-[300px] truncate" title={row[field]}>{row[field]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.data.length === 0 && (
            <p className="text-gray-500 text-center py-4">No data in this file.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TxtFileViewer({ file }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTxt = async () => {
      setLoading(true);
      setError(null);
      setContent('');
      try {
        // Use URL-safe encoding
        const dir = encodeURIComponent(file.dir);
        const name = encodeURIComponent(file.name);
        const url = `${API_URL}/results_file/${dir}/${name}`;

        const response = await apiClient.get(url);
        setContent(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTxt();
  }, [file]);

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <h4 className="font-semibold text-white mb-3 truncate">{file.name}</h4>
      {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
      {error && <p className="text-red-400 text-xs">Error fetching file: {error}</p>}
      {content && (
        <pre className="w-full text-gray-300 overflow-x-auto text-xs max-h-[70vh] custom-scrollbar">
          {content}
        </pre>
      )}
      {!content && !loading && !error && (
         <p className="text-gray-500 text-center py-4">This file is empty.</p>
      )}
    </div>
  );
}

// --- Custom Scrollbar CSS ---
// This file should be imported, but for a single file app,
// we can inject it with a style tag.
const style = document.createElement('style');
style.innerHTML = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #2d3748; /* gray-800 */
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4a5568; /* gray-600 */
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #718096; /* gray-500 */
}
`;
document.head.appendChild(style);