// pages/api/uploadToDrive.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { google } from 'googleapis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    // Only allow POST requests
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the user session
  const session = await getSession({ req });

  if (!session || !session.accessToken) {
    // If the user is not authenticated or access token is missing
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { encryptedData, fileName } = req.body;

  if (!encryptedData || !fileName) {
    return res.status(400).json({ message: 'Missing encryptedData or fileName' });
  }

  try {
    // Initialize OAuth2 Client with user's access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken as string });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Prepare file metadata and media
    const fileMetadata = {
      name: fileName,
    };

    // Convert encryptedData (assumed to be a Base64 string) to a buffer
    const buffer = Buffer.from(encryptedData, 'base64');

    const media = {
      mimeType: 'application/octet-stream',
      body: buffer,
    };

    // Upload the file to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    res.status(200).json({ fileId: driveResponse.data.id });
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    res.status(500).json({ message: 'Error uploading to Drive' });
  }
}
