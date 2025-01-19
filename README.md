# Hipermeganet

Hipermeganet is a comprehensive YouTube channel management tool designed to help content creators and channel managers streamline their workflow. This application allows users to manage multiple YouTube channels, track video performance, and analyze channel growth metrics all in one place.

## Features

- Multi-channel management
- Video performance tracking
- Analytics dashboard
- Content scheduling
- Audience engagement metrics
- Custom report generation

## Prerequisites

Before installing Hipermeganet, ensure you have the following prerequisites:

1. **Node.js**: Download and install the latest LTS version from [nodejs.org](https://nodejs.org/).

2. **Local Server Environment**:
   - For Windows: Install [WAMP](https://www.wampserver.com/en/)
   - For macOS: Install [MAMP](https://www.mamp.info/en/mac/)
   - For Linux: Install [LAMP](https://www.linux.com/training-tutorials/easy-lamp-server-installation/)

3. **Git**: Download and install from [git-scm.com](https://git-scm.com/).

4. **Google Cloud Project**: To enable integration with YouTube, you need to create and configure a Google Cloud project and obtain OAuth credentials.

## How to Obtain Google OAuth Credentials

Follow these steps to get the necessary OAuth credentials (Client ID and Client Secret) to use with the Hipermeganet application:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing project.
3. Enable the **YouTube Data API v3** from the **APIs & Services** section.
4. Configure the **OAuth Consent Screen**:
   - Choose "External" as the user type.
   - Fill in the required details such as application name, support email, and developer contact information.
   - Add the following scopes to the consent screen:
     - `https://www.googleapis.com/auth/youtube`
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/youtube.force-ssl`
   - Save and continue to the next step.
5. Go to **Credentials** and create a new **OAuth Client ID**:
   - Select the application type (e.g., Web Application or Desktop Application).
   - Enter the necessary details and click **Create**.
6. Once created, you will get your **Client ID** and **Client Secret**. Make sure to copy these values and keep them secure.


## Installation and Setup

Follow these steps to set up and run Hipermeganet:

1. Clone the repository:
   ```
   git clone https://gitlab.com/majaus/hipermeganet-electron
   cd hipermeganet
   ```

2. Install the project dependencies:
   ```
   npm install
   ```

3. Start your local server environment (WAMP, MAMP, or LAMP).

4. Start the application:
   ```
   npm start
   ```

The Hipermeganet application should now launch, and you can begin managing your YouTube channels more efficiently.
Note: If you dont have a CRM account or parthner, then you need to add channel by channel (add one account for each channel also if is same account for more than one channel).