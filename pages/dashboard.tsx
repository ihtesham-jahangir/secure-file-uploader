import { useState } from 'react';
import { FiUpload, FiFileText, FiLogOut } from 'react-icons/fi';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'upload' | 'showFiles'>('upload');

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-100 to-blue-300">
      {/* Sidebar Navigation */}
      <div className="w-1/4 bg-blue-900 text-white p-6 shadow-lg flex flex-col items-center">
        <h2 className="text-3xl font-extrabold mb-10 text-center">Alpha Secure File Uploader</h2>
        <nav className="space-y-4 w-full">
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-lg font-semibold transition ${
              activeTab === 'upload'
                ? 'bg-blue-700 shadow-lg text-blue-200'
                : 'hover:bg-blue-800 hover:shadow-md'
            }`}
          >
            <FiUpload className="mr-2" />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('showFiles')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-lg font-semibold transition ${
              activeTab === 'showFiles'
                ? 'bg-blue-700 shadow-lg text-blue-200'
                : 'hover:bg-blue-800 hover:shadow-md'
            }`}
          >
            <FiFileText className="mr-2" />
            Show Encrypted Files
          </button>
        </nav>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-10 bg-gray-50 shadow-inner rounded-tl-3xl overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
          {activeTab === 'upload' && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">Upload and Encrypt File</h2>
              <div className="bg-gray-100 p-6 rounded-lg shadow-md">
                <FileUpload />
              </div>
            </div>
          )}
          {activeTab === 'showFiles' && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">Your Encrypted Files</h2>
              <div className="bg-gray-100 p-6 rounded-lg shadow-md">
                <FileList />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
