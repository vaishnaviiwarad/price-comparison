# Price Comparison

## Setup after cloning

Install dependencies separately for the backend and frontend:

```powershell
cd Backend
npm install
npm run setup-browser
```

```powershell
cd ../Frontend
npm install
```

`npm run setup-browser` downloads the Chrome build used by Puppeteer. Without it, a new PC can fail with `Could not find Chrome`.

If Chrome is already installed somewhere custom, set one of these before starting the backend:

```powershell
$env:CHROME_EXECUTABLE_PATH="C:\Path\To\chrome.exe"
```

or

```powershell
$env:PUPPETEER_EXECUTABLE_PATH="C:\Path\To\chrome.exe"
```
