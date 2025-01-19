# Hipermeganet

<div align="center">
  <h4>A powerful YouTube channel management tool for content creators</h4>
</div>

Hipermeganet is a comprehensive YouTube channel management tool designed to help content creators and channel managers streamline their workflow. This application allows you to manage multiple YouTube channels, track videos, and handle the entire upload process from a single interface.

## ✨ Features

### 🎥 Multi-Channel Management
- Manage multiple channels from a single interface
- Automatic synchronization with YouTube to keep data updated
- Handle authentication tokens and credentials per channel

### 📹 Video Management
- Bulk video uploads to multiple channels
- Batch metadata editing (titles, descriptions, tags)
- Visibility control (public, private, unlisted)
- Kids content settings management
- Automatic video files and thumbnail assignment

### 🖼️ Thumbnail Management
- Built-in thumbnail editor with text support
- Font customization, colors, and effects
- Bulk thumbnail generation
- Real-time preview

### 🌐 Translation Management 
- Automatic metadata translation using GPT-4
- Multiple language support
- Bulk video translation

### 🛠️ Additional Features
- Advanced filtering system for search and organization
- Database backup and restore functionality

## 🚀 Getting Started

### Prerequisites

Before installing Hipermeganet, ensure you have:

1. **Node.js**: Download and install the latest LTS version from [nodejs.org](https://nodejs.org/)
2. **Git**: Download and install from [git-scm.com](https://git-scm.com/)
3. **Google Cloud Project**: To enable YouTube integration, you need to create and configure a Google Cloud project and obtain OAuth credentials.

### How to Obtain Google OAuth Credentials

Follow these steps to get the necessary credentials (Client ID and Client Secret):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3** from the **APIs & Services** section
4. Configure the **OAuth Consent Screen**:
   - Choose "External" as the user type
   - Fill in the required details (application name, support email, contact information)
   - Add the following scopes to the consent screen:
     - `https://www.googleapis.com/auth/youtube`
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
5. Go to **Credentials** and create a new **OAuth Client ID**:
   - Select application type (Desktop Application)
   - Enter the necessary details and click **Create**
6. Once created, you'll get your **Client ID** and **Client Secret**. Save these values securely.

### Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://gitlab.com/majaus/hipermeganet-electron
   cd hipermeganet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

### Initial Configuration

1. Go to the "Configuration" tab
2. Fill in the following fields:
   - GPT API Key: Your OpenAI API key for translations
   - Google Client ID: Your OAuth client ID
   - Google Client Secret: Your OAuth client secret
   - Global Video Path: The path where videos and thumbnails will be stored

## 📖 Basic Usage

### Adding an Account
1. Go to the "Accounts" tab
2. Click "Add Account"
3. Follow the Google authentication process

### Synchronizing Channels
- Channels will sync automatically after adding an account
- Use the "Sync" button to update manually

### Managing Videos
- Use the "Videos" tab for a general overview
- "Video Details" for metadata management
- "Video Details 2" for additional settings

### Uploading Videos
1. Select videos from the list
2. Use "Upload All" in the bulk actions section
3. Confirm the upload and wait for the process to complete

## 📝 Important Notes

- The application uses a local SQLite database to store information
- Make regular database backups using the options in the configuration tab