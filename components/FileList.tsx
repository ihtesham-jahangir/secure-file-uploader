import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function FileList() {
  const { data: session, status } = useSession();
  const [folders, setFolders] = useState<Array<any>>([]);
  const [decryptionInProgress, setDecryptionInProgress] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [passphrase, setPassphrase] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Configuration
  const MAX_PARALLEL_DOWNLOADS = 5; // Limit parallel downloads

  // Function to fetch folders from Google Drive
  const fetchFolders = async () => {
    if (!session?.accessToken) return;

    try {
      const query = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const params = new URLSearchParams({
        q: query,
        fields: 'files(id, name, createdTime)',
        spaces: 'drive',
        orderBy: 'createdTime desc'
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      setFolders(data.files || []);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      setToastMessage(`Failed to fetch files: ${error.message}`);
    }
  };

  // Function to derive encryption key with salt
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
    return await window.crypto.subtle.deriveKey(
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
  };

  // Fetch list of chunks for a specific folder
  const fetchChunks = async (folderId: string, accessToken: string) => {
    const query = `'${folderId}' in parents and trashed=false`;
    const params = new URLSearchParams({
      q: query,
      fields: 'files(id, name, size)',
      orderBy: 'name'
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch file chunks');
    }

    const data = await response.json();
    return data.files.sort((a: any, b: any) => 
      parseInt(a.name.replace('chunk', '')) - parseInt(b.name.replace('chunk', ''))
    );
  };

  // Download a single chunk
  const downloadChunk = async (fileId: string, accessToken: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download chunk');
    }

    return await response.arrayBuffer();
  };

  // Decrypt a chunk
  const decryptChunk = async (encryptedChunk: ArrayBuffer, passphrase: string) => {
    const data = new Uint8Array(encryptedChunk);
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encryptedData = data.slice(28);

    const key = await deriveKey(passphrase, salt);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    return decryptedBuffer;
  };

  // Combine chunks and create downloadable file
  const downloadAndDecryptFile = async (folderName: string, folderID: string) => {
    if (!session?.accessToken || !passphrase) {
      setToastMessage('Please enter the passphrase');
      return;
    }

    setDecryptionInProgress(folderName);
    setProgress(0);

    try {
      // Fetch chunks
      const chunks = await fetchChunks(folderID, session.accessToken);
      const totalChunks = chunks.length;

      // Parallel chunk download and decryption
      const decryptedChunks: ArrayBuffer[] = [];
      for (let i = 0; i < totalChunks; i += MAX_PARALLEL_DOWNLOADS) {
        const currentBatch = chunks.slice(i, i + MAX_PARALLEL_DOWNLOADS);
        
        const batchPromises = currentBatch.map(async (chunk: any) => {
          const downloadedChunk = await downloadChunk(
            chunk.id ?? '', // Default to an empty string
            session.accessToken ?? '' // Default to an empty string
          );
          
          const decryptedChunk = await decryptChunk(downloadedChunk, passphrase);
          decryptedChunks[chunks.indexOf(chunk)] = decryptedChunk;
          setProgress(((decryptedChunks.filter(c => c).length) / totalChunks) * 100);
        });

        await Promise.all(batchPromises);
      }

      // Combine decrypted chunks
      const combinedBuffer = new Uint8Array(decryptedChunks.reduce((total, chunk) => total + chunk.byteLength, 0));
      let offset = 0;
      decryptedChunks.forEach(chunk => {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      });

      // Create and trigger download
      const blob = new Blob([combinedBuffer]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = folderName;
      link.click();

      setToastMessage(`File ${folderName} decrypted and downloaded successfully!`);
    } catch (error: any) {
      console.error('Decryption error:', error);
      setToastMessage(`Decryption failed: ${error.message}`);
    } finally {
      setDecryptionInProgress(null);
      setProgress(0);
    }
  };

  // Delete a file/folder
  const deleteFile = async (folderID: string, folderName: string) => {
    if (!session?.accessToken) return;

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderID}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      // Remove the folder from the list
      setFolders(folders.filter(folder => folder.id !== folderID));
      setToastMessage(`${folderName} deleted successfully`);
    } catch (error: any) {
      console.error('Delete error:', error);
      setToastMessage(`Delete failed: ${error.message}`);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchFolders();
    }
  }, [session]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Please sign in to view your files</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
    <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Encrypted Files</h2>
  
    {toastMessage && (
      <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded shadow">
        {toastMessage}
        <button
          onClick={() => setToastMessage(null)}
          className="ml-4 text-yellow-600 hover:text-yellow-800 font-semibold"
        >
          Dismiss
        </button>
      </div>
    )}
  
    {decryptionInProgress && (
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-500 h-4 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-center mt-2 text-sm text-gray-700">
          Decrypting {decryptionInProgress}: {Math.round(progress)}%
        </p>
      </div>
    )}
  
    <div className="mb-6">
      <input
        type="password"
        placeholder="Enter Decryption Passphrase"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring focus:ring-blue-200 focus:border-blue-400"
      />
    </div>
  
    {folders.length === 0 ? (
      <p className="text-center text-gray-500">No encrypted files found.</p>
    ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="bg-white shadow-lg rounded-lg p-4 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-semibold text-lg text-gray-800 truncate">
                {folder.name}
              </h3>
              <p className="text-sm text-gray-500">
                Uploaded: {new Date(folder.createdTime).toLocaleDateString()}
              </p>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => downloadAndDecryptFile(folder.name, folder.id)}
                disabled={decryptionInProgress !== null}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Decrypt
              </button>
              <button
                onClick={() => deleteFile(folder.id, folder.name)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  
  );
} 
