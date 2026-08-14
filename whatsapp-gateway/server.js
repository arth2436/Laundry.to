const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 5000;
let latestQrBase64 = null;
let connectionStatus = 'Initializing';
let connectedNumber = null;
let publicTunnelUrl = null; // Set when ngrok tunnel is active

// ─── Auto-Tunnel via ngrok ────────────────────────────────────────────────────
// Reads ngrok-config.json for authToken and optional staticDomain.
// If file is missing or token is empty, skips tunnel (local-only mode).
async function startTunnel() {
  const configPath = path.join(__dirname, 'ngrok-config.json');
  if (!fs.existsSync(configPath)) return;

  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { return; }

  const { authToken, staticDomain } = cfg;
  if (!authToken) return;

  try {
    const ngrok = require('@ngrok/ngrok');
    const options = { addr: PORT, authtoken: authToken };
    if (staticDomain) options.domain = staticDomain;

    const listener = await ngrok.forward(options);
    publicTunnelUrl = listener.url();
    console.log('\n🌐 ─────────────────────────────────────────────────');
    console.log(`🌐  PUBLIC GATEWAY URL (copy this into Settings):`);
    console.log(`🌐  ${publicTunnelUrl}/messages/chat`);
    console.log('🌐 ─────────────────────────────────────────────────\n');

    // Save the URL to a file for easy copying
    fs.writeFileSync(path.join(__dirname, 'current-public-url.txt'),
      `${publicTunnelUrl}/messages/chat`);
  } catch (err) {
    console.error('⚠️  ngrok tunnel failed to start:', err.message);
    console.log('Running in local-only mode (localhost:5000).');
  }
}

// ─── Process Safety ───────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ─── WhatsApp Client ──────────────────────────────────────────────────────────
let client = null;

function initializeClient() {
  console.log('Starting WhatsApp Client...');
  connectionStatus = 'Initializing';

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, 'whatsapp_sessions')
    }),
    puppeteer: {
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      ]
    }
  });

  client.on('qr', (qr) => {
    connectionStatus = 'Scanning';
    QRCode.toDataURL(qr, (err, url) => {
      if (!err) latestQrBase64 = url;
    });
    console.log('New QR Code generated, please scan in your browser.');
  });

  client.on('ready', () => {
    connectionStatus = 'Connected';
    latestQrBase64 = null;
    const info = client.info;
    connectedNumber = info ? info.wid.user : null;
    console.log(`🎉 WhatsApp Client connected: +${connectedNumber} 🎉`);
  });

  client.on('authenticated', () => {
    console.log('Authenticated successfully!');
  });

  client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
    connectionStatus = 'Disconnected';
    latestQrBase64 = null;
  });

  client.on('disconnected', async (reason) => {
    console.log('Client was logged out:', reason);
    connectionStatus = 'Initializing';
    latestQrBase64 = null;
    connectedNumber = null;
    try { await client.destroy(); } catch (e) {}
    initializeClient();
  });

  client.initialize().catch(async (err) => {
    console.error('Failed to initialize client:', err.message);
    connectionStatus = 'Disconnected';
    try { await client.destroy(); } catch (e) {}
    const lockFile = path.join(__dirname, 'whatsapp_sessions', 'session', 'SingletonLock');
    try { fs.unlinkSync(lockFile); } catch (e) {}
    console.log('Retrying in 5 seconds...');
    setTimeout(initializeClient, 5000);
  });
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

// Status — returns current state + QR + public URL
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: latestQrBase64,
    number: connectedNumber,
    publicUrl: publicTunnelUrl ? `${publicTunnelUrl}/messages/chat` : null
  });
});

// Send message
app.post('/messages/chat', async (req, res) => {
  const { to, body, pdf, pdfName } = req.body;
  if (!to || (!body && !pdf)) {
    return res.status(400).json({ success: false, message: 'Missing parameters.' });
  }

  let cleanPhone = to.toString().replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
  const jid = `${cleanPhone}@c.us`;

  try {
    if (connectionStatus !== 'Connected') {
      return res.status(503).json({ success: false, message: 'WhatsApp not ready. Please scan the QR code.' });
    }
    if (body) {
      await client.sendMessage(jid, body);
      console.log(`Text message sent to +${cleanPhone}`);
    }
    if (pdf) {
      const cleanPdf = pdf.includes(',') ? pdf.split(',')[1] : pdf;
      const media = new MessageMedia('application/pdf', cleanPdf, pdfName || 'Invoice.pdf');
      await client.sendMessage(jid, media);
      console.log(`PDF sent to +${cleanPhone}`);
    }
    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Failed: ${error.message}` });
  }
});

// Disconnect
app.post('/disconnect', async (req, res) => {
  connectionStatus = 'Initializing';
  latestQrBase64 = null;
  connectedNumber = null;
  res.json({ success: true });
  try { await client.logout(); } catch (err) {
    connectionStatus = 'Disconnected';
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Local WhatsApp Gateway running on http://localhost:${PORT}`);
  await startTunnel(); // Start ngrok tunnel if configured
  initializeClient();  // Start WhatsApp client
});
