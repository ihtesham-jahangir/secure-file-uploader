import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function FileList() {
  const { data: session } = useSession();
  const [folders, setFolders] = useState<Array<any>>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (session) {
      fetchFolders();
    }
  }, [session]);

  // Function to fetch folders representing original files
  const fetchFolders = async () => {
    try {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id, name, mimeType, size)',
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false", // Query only folders
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching folders:', errorData);
        throw new Error(errorData.error.message || 'Failed to fetch folders');
      }

      const data = await response.json();
      setFolders(data.files);
    } catch (error: any) {
      console.error('Fetch Folders Error:', error);
      showToast(error.message || 'Failed to load folders');
    }
  };

  // Function to show toast notifications
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000); // Hide toast after 3 seconds
  };

  // Handle passphrase input
  const handlePassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassphrase(e.target.value);
    setErrorMessage(''); // Clear error when user starts typing
  };

  // Handle folder selection
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setErrorMessage('');
  };

  // Handle download
  const handleDownload = async (folderId: string, folderName: string) => {
    if (!passphrase) {
      showToast('Please enter the passphrase.');
      return;
    }

    setDownloading(true);
    setProgress(0);

    try {
      // Fetch all chunk files within the folder
      const chunks = await fetchChunksInFolder(folderId);
      console.log(`Total Chunks to Download: ${chunks.length}`);

      if (chunks.length === 0) {
        throw new Error('No chunks found in the selected folder.');
      }

      // Sort chunks by name (assuming chunk1, chunk2, ...)
      const sortedChunks = chunks.sort((a, b) => {
        const aNum = parseInt(a.name.replace('chunk', ''), 10);
        const bNum = parseInt(b.name.replace('chunk', ''), 10);
        return aNum - bNum;
      });

      const decryptedChunks: ArrayBuffer[] = [];

      // Iterate over each chunk, decrypt, and store
      for (let i = 0; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i];
        console.log(`Downloading and decrypting chunk ${i + 1}/${sortedChunks.length}`);

        // Download the encrypted chunk
        const encryptedData = await downloadFile(chunk.id, chunk.name);

        // Decrypt the chunk
        const decryptedData = await decryptChunk(encryptedData, passphrase);
        if (!decryptedData) {
          throw new Error('Decryption failed. Please check your passphrase.');
        }

        decryptedChunks.push(decryptedData);

        // Update progress
        setProgress(((i + 1) / sortedChunks.length) * 100);
      }

      // Merge all decrypted chunks
      const originalFileBuffer = mergeChunks(decryptedChunks);
      console.log(`Original File Size: ${originalFileBuffer.byteLength} bytes`);

      // Create a Blob and trigger download
      const blob = new Blob([originalFileBuffer]);
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = `${folderName}`; // Original file name
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);

      setDownloading(false);
      showToast('File downloaded and decrypted successfully!');
    } catch (error: any) {
      console.error('Download and Decryption Error:', error);
      showToast(error.message || 'Error downloading and decrypting file');
      setDownloading(false);
    }
  };

  // Function to fetch all chunks in a folder
  const fetchChunksInFolder = async (folderId: string): Promise<Array<any>> => {
    try {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id, name, mimeType, size)',
        q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`, // Query files (chunks) within the folder
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching chunks:', errorData);
        throw new Error(errorData.error.message || 'Failed to fetch chunks');
      }

      const data = await response.json();
      return data.files;
    } catch (error: any) {
      console.error('Fetch Chunks Error:', error);
      throw error;
    }
  };

  // Function to download a single chunk
  const downloadFile = async (fileId: string, fileName: string): Promise<Uint8Array> => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to download chunk ${fileName}: ${errorData.error.message}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error: any) {
      console.error('Download Chunk Error:', error);
      throw error;
    }
  };

  // Function to derive decryption key with salt
  const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const passphraseKey = enc.encode(passphrase);
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passphraseKey,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    return key;
  };

  // Function to decrypt a chunk
  const decryptChunk = async (encryptedData: Uint8Array, passphrase: string): Promise<ArrayBuffer | null> => {
    try {
      // Extract salt (first 16 bytes), IV (next 12 bytes), ciphertext (rest)
      const salt = encryptedData.slice(0, 16);
      const iv = encryptedData.slice(16, 28);
      const ciphertext = encryptedData.slice(28);

      // Derive key using passphrase and extracted salt
      const key = await deriveKey(passphrase, salt);

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertext
      );

      return decrypted;
    } catch (error) {
      console.error('Decryption Error:', error);
      showToast('Failed to decrypt a chunk. Please check your passphrase and try again.');
      return null;
    }
  };

  // Function to merge all decrypted chunks
  const mergeChunks = (chunks: ArrayBuffer[]): ArrayBuffer => {
    let totalLength = 0;
    chunks.forEach(chunk => {
      totalLength += chunk.byteLength;
    });

    const mergedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    chunks.forEach(chunk => {
      mergedBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    });

    return mergedBuffer.buffer;
  };

  // Handle file deletion
  const handleDelete = async (folderId: string) => {
    const confirmDelete = confirm('Are you sure you want to delete this file and all its chunks?');
    if (!confirmDelete) return;

    setDeleting(folderId);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete folder: ${errorData.error.message}`);
      }

      setFolders((prevFolders) => prevFolders.filter((folder) => folder.id !== folderId));
      showToast('File and all its chunks deleted successfully!');
    } catch (error: any) {
      console.error('Delete Error:', error);
      showToast(error.message || 'Error deleting file');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-xl mt-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Encrypted Files</h2>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      <div className="mb-6">
        <input
          type="password"
          placeholder="Enter decryption passphrase"
          value={passphrase}
          onChange={handlePassphraseChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
        />
        {errorMessage && <p className="mt-2 text-red-500 text-sm">{errorMessage}</p>}
      </div>

      {folders.length === 0 ? (
        <p className="text-gray-600 text-center">No files found. Upload some files first.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-4 px-6 text-left font-semibold text-gray-700 uppercase tracking-wider">File Name</th>
                <th className="py-4 px-6 text-left font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={folder.id} className="border-t hover:bg-gray-50">
                  <td className="py-4 px-6 text-gray-800 font-medium">{folder.name}</td>
                  <td className="py-4 px-6 flex flex-col justify-end space-y-2">
                    <button
                      onClick={() => handleDownload(folder.id, folder.name)}
                      disabled={downloading}
                      className={`px-3 py-1.5 text-sm font-semibold text-white rounded-lg shadow-md transition-all ${
                        downloading
                          ? 'bg-purple-300 cursor-not-allowed'
                          : 'bg-purple-500 hover:bg-purple-600'
                      }`}
                    >
                      {downloading ? (
                        <span className="flex items-center space-x-2">
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            ></path>
                          </svg>
                          <span>Decrypting...</span>
                        </span>
                      ) : (
                        'Download & Decrypt'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(folder.id)}
                      disabled={deleting === folder.id}
                      className={`px-3 py-1.5 text-sm font-semibold text-white rounded-lg shadow-md transition-all ${
                        deleting === folder.id
                          ? 'bg-red-300 cursor-not-allowed'
                          : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {deleting === folder.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Download Progress */}
      {downloading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-purple-500 h-4 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center mt-2 text-gray-600">{Math.round(progress)}% downloaded</p>
        </div>
      )}
    </div>
  );
}
