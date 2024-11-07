// components/FileList.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import CryptoJS from 'crypto-js';

export default function FileList() {
  const { data: session } = useSession();
  const [files, setFiles] = useState([]);
  const [passphrase, setPassphrase] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (session) {
      fetchFiles();
    }
  }, [session]);

  const fetchFiles = async () => {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );
    const data = await response.json();
    setFiles(data.files);
  };

  const handlePassphraseChange = (e) => {
    setPassphrase(e.target.value);
  };

  const handleDownload = async (fileId, fileName) => {
    if (!passphrase) {
      alert('Please enter the passphrase.');
      return;
    }

    setDownloading(fileId);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      alert('Failed to download file.');
      setDownloading(null);
      return;
    }

    const encryptedData = await response.text();
    const decryptedData = decryptFile(encryptedData, passphrase);

    if (!decryptedData) {
      alert('Decryption failed. Incorrect passphrase.');
      setDownloading(null);
      return;
    }

    // Create a link to download the decrypted file
    const element = document.createElement('a');
    element.setAttribute('href', decryptedData);
    element.setAttribute('download', `decrypted_${fileName}`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setDownloading(null);
  };

  const handleDelete = async (fileId) => {
    const confirmDelete = confirm('Are you sure you want to delete this file?');
    if (!confirmDelete) return;

    setDeleting(fileId);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      alert('Failed to delete file.');
      setDeleting(null);
      return;
    }

    // Remove the file from the list
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    setDeleting(null);
  };

  const decryptFile = (encryptedData, passphrase) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, passphrase);
      const originalData = bytes.toString(CryptoJS.enc.Utf8);
      return originalData;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Encrypted Files</h2>
      
      <div className="mb-4">
        <input
          type="password"
          placeholder="Enter decryption passphrase"
          value={passphrase}
          onChange={handlePassphraseChange}
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      
      {files.length === 0 ? (
        <p className="text-gray-600">No files found. Upload some files first.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b text-left font-semibold text-gray-700">File Name</th>
                <th className="py-2 px-4 border-b text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{file.name}</td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <button
                      onClick={() => handleDownload(file.id, file.name)}
                      disabled={downloading === file.id}
                      className={`px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition ${
                        downloading === file.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {downloading === file.id ? 'Decrypting...' : 'Download & Decrypt'}
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deleting === file.id}
                      className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition ${
                        deleting === file.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {deleting === file.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
