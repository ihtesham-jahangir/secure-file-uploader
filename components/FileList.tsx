// components/FileList.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function FileList() {
  const { data: session, status } = useSession();
  const [folders, setFolders] = useState<Array<any>>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

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
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false", // Query only folders
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

  // Handle download
  const handleDownload = async (folderId: string, folderName: string) => {
    if (!passphrase) {
      showToast('Please enter the passphrase.');
      return;
    }

    if (!session?.accessToken) {
      showToast('User session is not available.');
      return;
    }

    setDownloading(true);
    setProgress(0);

    try {
      const chunks = await fetchChunksInFolder(folderId);
      if (chunks.length === 0) throw new Error('No chunks found in the selected folder.');

      const decryptedChunks: ArrayBuffer[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const encryptedData = await downloadFile(chunks[i].id);
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
      alert('Download and Decryption Error:');
      showToast(error.message || 'Error downloading and decrypting file');
    } finally {
      setDownloading(false);
    }
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
          onChange={handlePassphraseChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none"
        />
        {errorMessage && <p className="mt-2 text-red-500 text-sm">{errorMessage}</p>}
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
                    disabled={downloading}
                    className="bg-purple-500 text-white px-3 py-1.5 rounded-lg"
                  >
                    {downloading ? 'Decrypting...' : 'Download & Decrypt'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
