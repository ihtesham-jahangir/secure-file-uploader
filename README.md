# Encrypted File Manager

![Encrypted File Manager](https://github.com/ihtesham-jahangir/secure-file-uploader/blob/master/public/image.png)

**Encrypted File Manager** is a secure Next.js application that allows users to authenticate with their Google accounts, access their Google Drive, and manage encrypted files seamlessly. Users can decrypt and download their encrypted files directly from Google Drive by providing a passphrase.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## Features

- **Google Authentication:** Securely authenticate users using Google OAuth via NextAuth.
- **Google Drive Integration:** Access and list encrypted files from the user's Google Drive.
- **File Decryption:** Decrypt encrypted files on the client-side using a user-provided passphrase.
- **Secure Downloads:** Download decrypted files in their original format (e.g., images, PDFs).
- **Responsive UI:** Intuitive and responsive user interface for seamless user experience.

## Demo

*(Include a link to a live demo if available)*

[Live Demo](https://your-live-demo-link.com)

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- **Node.js:** Ensure you have Node.js installed. You can download it [here](https://nodejs.org/).
- **Google Cloud Account:** Access to Google Cloud Console to set up OAuth credentials.

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-username/encrypted-file-manager.git
   cd encrypted-file-manager
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

### Environment Variables

Create a `.env.local` file in the root directory and add your Google OAuth credentials:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=your-google-redirect-uri
```

## Usage

1. **Run the Development Server:**

   ```bash
   npm run dev
   ```

2. **Access the Application:** Open your browser and navigate to `http://localhost:3000`.
   '''
   - Click on the "Sign In" button to authenticate with Google.
   - After authentication, you'll be redirected to the application.
   - Select an encrypted file from the list to decrypt and download.
   - Enter the passphrase to decrypt the file.
   - Click "Download" to download the decrypted file.
   '''

## Project Structure

The project is organized as follows:

```
encrypted-file-manager/
├── components/
│   └── FileList.tsx        # Component to list, decrypt, and download files
├── pages/
│   ├── api/
│   │   └── auth/[...nextauth].ts  # NextAuth API routes
│   └── index.tsx            # Home page
├── public/
│   └── favicon.ico
├── styles/
│   └── globals.css
├── .env.local               # Environment variables
├── package.json
├── tsconfig.json
└── README.md


## Obtaining Google OAuth Credentials
Navigate to Google Cloud Console:

Go to the Google Cloud Console.

Create a New Project:

Click on the project dropdown and select "New Project."
Enter a project name and click "Create."
Enable Google Drive API:

Navigate to APIs & Services > Library.
Search for "Google Drive API" and click "Enable."
Configure OAuth Consent Screen:

Go to APIs & Services > OAuth consent screen.
Choose "External" for the user type and click "Create."
Fill in the required details and add scopes:
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/userinfo.email
Save and continue through the setup.
Create OAuth Client ID:

Navigate to APIs & Services > Credentials.
Click "Create Credentials" and select "OAuth client ID."
Choose "Web application" as the application type.
Set the Authorized JavaScript origins to http://localhost:3000.
Set the Authorized redirect URIs to http://localhost:3000/api/auth/callback/google.
Click "Create" and note down the Client ID and Client Secret.

## Technologies Used

- **Next.js:** React framework for building server-side rendered applications.
- **NextAuth:** Authentication library for Next.js.
- **Google Drive API:** API for accessing Google Drive files.
- **React Hook Form:** Form handling library for React.
- **Tailwind CSS:** Utility-first CSS framework for styling.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

# Contact Information

For any questions or issues, please open an issue on the GitHub repository.

---

This README file provides a comprehensive guide to setting up and using the encrypted file manager application. It covers the installation process, environment variable setup, usage instructions, project structure, and additional resources.
