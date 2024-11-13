import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function FileList() {
  const { data: session, status } = useSession();
  const [folders, setFolders] = useState<Array<any>>([]);
  const [decryptionInProgress, setDecryptionInProgress] = useState<string | null>(null); // Track file being decrypted
  const [progress, setProgress] = useState<number>(0);
  const [passphrase, setPassphrase] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      fetchFolders();
    }
  }, [session]);

  // Function to fetch folders representing original files
  const fetchFolders = async () => {
    if (!session?.accessToken) {
      showToast('User session is not available.');
      return;
    }

    try {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id, name, mimeType, size)',
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to fetch folders');
      }

      const data = await response.json();
      setFolders(data.files);
    } catch (error: any) {
      console.error('Fetch Folders Error:', error);
      showToast(error.message || 'Failed to load folders');
    }
  };

  // Function to fetch chunks for a specific folder
  const fetchChunksInFolder = async (folderId: string): Promise<Array<any>> => {
    if (!session?.accessToken) {
      showToast('User session is not available.');
      return [];
    }

    try {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id, name, mimeType, size)',
        q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Failed to fetch chunks');
      }

      const data = await response.json();
      return data.files;
    } catch (error: any) {
      console.error('Fetch Chunks Error:', error);
      showToast(error.message || 'Error fetching chunks');
      return [];
    }
  };

  // Download and decrypt a specific chunk
  const downloadFile = async (fileId: string): Promise<Uint8Array | null> => {
    if (!session?.accessToken) {
      showToast('User session is not available.');
      return null;
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to download chunk: ${errorData.error.message}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error: any) {
      console.error('Download Chunk Error:', error);
      throw error;
    }
  };

  // Derive decryption key with salt
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
    return window.crypto.subtle.deriveKey(
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

  // Decrypt a chunk
  const decryptChunk = async (encryptedData: Uint8Array, passphrase: string): Promise<ArrayBuffer> => {
    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const ciphertext = encryptedData.slice(28);
    const key = await deriveKey(passphrase, salt);

    return window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );
  };

  // Merge decrypted chunks
  const mergeChunks = (chunks: ArrayBuffer[]): ArrayBuffer => {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const mergedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mergedBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    return mergedBuffer.buffer;
  };

  // Handle download and decryption for specific file
  const handleDownload = async (folderId: string, folderName: string) => {
    if (!passphrase) {
      showToast('Please enter the passphrase.');
      return;
    }

    if (!session?.accessToken) {
      showToast('User session is not available.');
      return;
    }

    setDecryptionInProgress(folderId);
    setProgress(0);

    try {
      const chunks = await fetchChunksInFolder(folderId);
      if (chunks.length === 0) throw new Error('No chunks found in the selected folder.');

      const decryptedChunks: ArrayBuffer[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const encryptedData = await downloadFile(chunks[i].id);
        if (!encryptedData) throw new Error('Failed to download chunk');
        const decryptedData = await decryptChunk(encryptedData, passphrase);
        decryptedChunks.push(decryptedData);
        setProgress(((i + 1) / chunks.length) * 100);
      }

      const blob = new Blob([mergeChunks(decryptedChunks)]);
      const url = URL.createObjectURL(blob);
      const element = document.createElement('a');
      element.href = url;
      element.download = folderName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);

      showToast('File downloaded and decrypted successfully!');
    } catch (error: any) {
      console.error('Download and Decryption Error:', error);
      showToast(error.message || 'Error downloading and decrypting file');
    } finally {
      setDecryptionInProgress(null);
    }
  };

  // Show toast notifications
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-xl mt-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Encrypted Files</h2>
      {toastMessage && <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">{toastMessage}</div>}
      <div className="mb-6">
        <input
          type="password"
          placeholder="Enter decryption passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
        />
      </div>
      {status === 'loading' ? (
        <p className="text-center text-gray-600">Loading session...</p>
      ) : folders.length === 0 ? (
        <p className="text-center text-gray-600">No files found. Upload some files first.</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-4 px-6 text-left font-semibold text-gray-700">File Name</th>
              <th className="py-4 px-6 text-left font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((folder) => (
              <tr key={folder.id} className="border-t">
                <td className="py-4 px-6 text-gray-800">{folder.name}</td>
                <td className="py-4 px-6">
                  <button
                    onClick={() => handleDownload(folder.id, folder.name)}
                    disabled={decryptionInProgress === folder.id}
                    className="bg-purple-500 text-white px-3 py-1.5 rounded-lg"
                  >
                    {decryptionInProgress === folder.id ? 'Decrypting...' : 'Download & Decrypt'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {decryptionInProgress && (
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
