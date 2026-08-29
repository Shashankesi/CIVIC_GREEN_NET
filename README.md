# Civic GreenNet

Civic GreenNet is a modern, AI-powered civic issue management and smart city platform. It enables citizens to report infrastructure, safety, and environmental complaints, and provides municipal authorities with advanced tools to track, assign, verify, and resolve issues transparently in real-time.

## Features

- **AI-Powered Classification**: Automatically analyzes complaint descriptions and images (via Gemini/Groq) to suggest categories, estimate severity, and route tasks.
- **Location Intelligence**: Coordinates Leaflet maps with PGVector search to find nearby reports, generate heatmaps, and detect duplicates.
- **SLA & Deadline Monitoring**: Tracks response windows and triggers automated supervisor alerts for SLA breaches.
- **Responsive Portals**: Curated interfaces for Citizens, Officers, and Administrators built on a rich, dark-mode-first aesthetic.

---

## Getting Started

Follow these steps to set up and run the Civic GreenNet project locally:

### 1. Clone the Repository

```bash
git clone https://github.com/Shashankesi/CIVIC_GREEN_NET.git
cd CIVIC_GREEN_NET
```

### 2. Configure Environment Files

You need to create the `.env` configuration files for both the frontend (client) and backend (server) using the provided `.env.example` templates.

**For Linux/macOS:**
```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

**For Windows (PowerShell):**
```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

Open both `.env` files and add your local configuration details (database credentials, Resend Email API key, Cloudinary, and AI API keys).

### 3. Backend Setup

1. Navigate to the server directory and install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Initialize and run the database migrations:
   ```bash
   npm run migrate
   ```
   *(Ensure your `DATABASE_URL` is active in `server/.env` before running migrations)*
3. Start the Express development server:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup

1. In a new terminal window, navigate to the client directory and install dependencies:
   ```bash
   cd client
   npm install
   ```
2. Start the Vite React development application:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `civicgreennet.dev` to view the platform.



## Project Structure

- `client/`: React + Vite frontend application.
- `server/`: Express + Node.js backend server API.
- `server/sql/`: Database schemas and migration files.

## Security & Verification

This repository is secured against secret exposure. Real API keys, database connection strings, credentials, and environment files (`.env`, `.env.example`, etc.) are ignored by git and must be supplied locally.
