import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';

export default function FileUpload() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configuration
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage(null); // Reset error message on new file selection
    }
  };

  // Handle passphrase input
  const handlePassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassphrase(e.target.value);
    setErrorMessage(null); // Clear error when user starts typing
  };

  // Generate a random passphrase and include file name
  const generatePassphrase = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const randomPassphrase = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setPassphrase(randomPassphrase);

    // Ensure a file is selected
    if (!file) {
      alert('Please select a file first.');
      return;
    }

    // Create the content for the passphrase file, including the file name
    const passphraseContent = `File Name: ${file.name}\nYour Passphrase: ${randomPassphrase}`;
    const blob = new Blob([passphraseContent], { type: 'text/plain' });

    // Trigger the download of the passphrase file
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'passphrase.txt';
    link.click();
  };

  // Function to encrypt a chunk with a unique salt
  const encryptChunkWithSalt = async (chunk: Blob, passphrase: string): Promise<{ encryptedChunk: ArrayBuffer; salt: Uint8Array }> => {
    const salt = generateSalt();
    const key = await deriveKey(passphrase, salt);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const arrayBuffer = await chunk.arrayBuffer();
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      arrayBuffer
    );

    // Prepend salt and IV to the encrypted data for decryption
    const combinedBuffer = new Uint8Array(salt.byteLength + iv.byteLength + encryptedBuffer.byteLength);
    combinedBuffer.set(salt, 0);
    combinedBuffer.set(iv, salt.byteLength);
    combinedBuffer.set(new Uint8Array(encryptedBuffer), salt.byteLength + iv.byteLength);
    return { encryptedChunk: combinedBuffer.buffer, salt };
  };

  // Helper function to generate a salt
  const generateSalt = (length: number = 16): Uint8Array => {
    return window.crypto.getRandomValues(new Uint8Array(length));
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
      ['encrypt', 'decrypt']
    );
    return key;
  };

  // The rest of your component logic remains the same...

  // Handle the upload process
  const handleUpload = async () => {
    if (!file || !session || !passphrase) {
      setErrorMessage('Please select a file and enter a passphrase.');
      return;
    }

    const accessToken = session.accessToken as string | undefined;

    if (!accessToken || !file.name) {
      setErrorMessage('Access token or file name is missing.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrorMessage(null);

    try {
      const folderExists = await checkIfFolderExists(file.name, accessToken);
      if (folderExists) {
        throw new Error('A file with the same name has already been uploaded.');
      }

      const folderId = await createDriveFolder(file.name, accessToken);
      const chunks = splitFileIntoChunks(file, CHUNK_SIZE);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const { encryptedChunk, salt } = await encryptChunkWithSalt(chunk, passphrase);
        const chunkFileName = `chunk${i + 1}.alpha`;
        const uploadUrl = await initiateResumableUpload(chunkFileName, accessToken, encryptedChunk.byteLength, folderId);

        await uploadChunk(uploadUrl, encryptedChunk);
        setProgress(((i + 1) / chunks.length) * 100);
      }

      alert('File uploaded successfully!');
      setFile(null);
      setPassphrase('');
    } catch (error: any) {
      console.error('Encryption or upload error:', error);
      setErrorMessage(error.message || 'An error occurred during encryption or upload.');
    } finally {
      setUploading(false);
    }
  };

  // The rest of your functions (checkIfFolderExists, createDriveFolder, etc.) stay the same...

  return (
    <div className="w-full max-w-md mx-auto bg-white shadow-lg rounded-lg p-8 mb-10">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Upload and Encrypt File</h2>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Enter encryption passphrase"
          value={passphrase}
          onChange={handlePassphraseChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {file && (
          <p className="text-gray-600 text-center">
            Selected File: <span className="font-medium">{file.name}</span>
          </p>
        )}
      </div>

      <div className="flex justify-between mt-6 space-x-4">
        <button
          onClick={generatePassphrase}
          className="w-1/2 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition"
        >
          Generate Passphrase
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-1/2 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Uploading...' : 'Encrypt & Upload'}
        </button>
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center mt-2 text-gray-600">{Math.round(progress)}% uploaded</p>
        </div>
      )}
    </div>
  );
}
