# WiseSpend

A minimal, pastel finance tracker for your laptop. Track income and expenses, move money between accounts, and keep custom categories and per-account logs.

## Download

Get the latest installer from the [Releases page](../../releases/latest):

- **Windows:** `WiseSpend-Setup-x.y.z.exe`
- **Mac (Apple Silicon, M1 or newer):** `WiseSpend-x.y.z-arm64.dmg`
- **Mac (Intel):** `WiseSpend-x.y.z-x64.dmg`

### First launch

The installers are not code-signed, so your system will warn you once.

- **Windows:** click **More info**, then **Run anyway**.
- **Mac:** open the `.dmg`, drag WiseSpend to Applications, then right-click the app and choose **Open**. If macOS says the app is damaged, run this in Terminal and open it again:
  `xattr -cr /Applications/WiseSpend.app`

## Features

- Add expenses, income and transfers between accounts
- Multiple accounts (one per bank, wallet or card) with live balances
- Custom expense and income categories
- Filterable logs by account, category and type

Your data is stored locally on your computer. Nothing is sent anywhere.

## Run from source

```
npm install
npm start
```

## Build installers

```
npm run dist:win   # on Windows
npm run dist:mac   # on a Mac
```

Installers appear in the `dist` folder. Pushing a tag like `v0.1.0` builds both and attaches them to a GitHub Release automatically.

## License

MIT
