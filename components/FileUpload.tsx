// components/FileUpload.tsx
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import CryptoJS from 'crypto-js';
import Image from 'next/image';

export default function FileUpload() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handlePassphraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassphrase(e.target.value);
  };

  const handleUpload = async () => {
    if (!file || !session || !passphrase) {
      alert('Please select a file and enter a passphrase.');
      return;
    }

    setUploading(true);
    const accessToken = session.accessToken;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target?.result;
      if (typeof fileData !== 'string') {
        alert('Failed to read file.');
        setUploading(false);
        return;
      }

      try {
        // Encrypt the file data using the passphrase
        const encrypted = CryptoJS.AES.encrypt(fileData, passphrase).toString();

        // Upload the encrypted data
        const response = await uploadToGoogleDrive(encrypted, file.name, accessToken);

        if (response.ok) {
          alert('File uploaded successfully!');
          setFile(null);
          setPassphrase('');
        } else {
          const errorData = await response.json();
          console.error('Upload failed:', errorData);
          alert('Upload failed. Please try again.');
        }
      } catch (error) {
        console.error('Encryption or upload error:', error);
        alert('An error occurred during encryption or upload.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadToGoogleDrive = async (encryptedData: string, fileName: string, accessToken: string) => {
    const metadata = {
      name: fileName,
      mimeType: 'application/octet-stream',
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append(
      'file',
      new Blob([encryptedData], { type: 'application/octet-stream' })
    );

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
        body: form,
      }
    );

    return response;
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center bg-white shadow-md rounded p-6 mb-8">
        <Image
          src="/images/upload.svg"
          alt="Upload Illustration"
          width={150}
          height={150}
        />
        <p className="mt-4 text-center text-gray-600">
          Please sign in to upload and encrypt your files securely.
        </p>
        <button
          onClick={() => signIn('google')}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow-md rounded p-6 mb-8">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload and Encrypt File</h2>
      <div className="flex flex-col md:flex-row items-center">
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full max-w-xs"
        />
        <input
          type="password"
          placeholder="Enter encryption passphrase"
          value={passphrase}
          onChange={handlePassphraseChange}
          className="mt-4 md:mt-0 md:ml-4 px-4 py-2 border rounded w-full max-w-xs"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`mt-4 md:mt-0 md:ml-4 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Uploading...' : 'Encrypt & Upload'}
        </button>
      </div>
      {file && (
        <p className="mt-4 text-gray-600">
          Selected File: <span className="font-medium">{file.name}</span>
        </p>
      )}
    </div>
  );
}
