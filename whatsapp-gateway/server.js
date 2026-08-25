const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5000;
const AUTH_FOLDER = path.join(__dirname, 'auth_info_baileys');

// ─── State ────────────────────────────────────────────────────────────────────
let latestQrBase64 = null;
let connectionStatus = 'Initializing'; // Initializing | Scanning | Connected | Disconnected
let connectedNumber = null;
let publicTunnelUrl = null;
let sock = null; // Baileys socket instance

// ─── Auto-Tunnel via ngrok ────────────────────────────────────────────────────
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

    fs.writeFileSync(
      path.join(__dirname, 'current-public-url.txt'),
      `${publicTunnelUrl}/messages/chat`
    );
  } catch (err) {
    console.error('⚠️  ngrok tunnel failed to start:', err.message);
    console.log('Running in local-only mode (localhost:' + PORT + ').');
  }
}

// ─── Process Safety ───────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ─── Baileys WhatsApp Client ──────────────────────────────────────────────────
async function initializeClient() {
  // Dynamically import Baileys (ESM module)
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidNormalizedUser
  } = await import('@whiskeysockets/baileys');

  console.log('🚀 Starting WhatsApp Client with Baileys...');
  connectionStatus = 'Initializing';

  // Ensure auth folder exists
  if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });

  // Load saved auth state (session persists across restarts)
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  // Get latest WA version
  let waVersion;
  try {
    const { version } = await fetchLatestBaileysVersion();
    waVersion = version;
    console.log(`📱 Using WA v${version.join('.')}`);
  } catch (e) {
    waVersion = [2, 3000, 1015901307];
    console.log('Using fallback WA version.');
  }

  // Silent logger (only errors shown)
  const logger = pino({ level: 'silent' });

  sock = makeWASocket({
    version: waVersion,
    logger,
    auth: state,
    printQRInTerminal: false, // We handle QR ourselves
    browser: ['Laundry App', 'Chrome', '122.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 3,
    syncFullHistory: false,
  });

  // ── Save credentials on update ──
  sock.ev.on('creds.update', saveCreds);

  // ── Connection updates ──
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'Scanning';
      connectedNumber = null;
      try {
        latestQrBase64 = await QRCode.toDataURL(qr);
        console.log('📱 New QR Code generated — scan it in the Settings page.');
      } catch (e) {
        console.error('QR generation error:', e.message);
      }
    }

    if (connection === 'open') {
      connectionStatus = 'Connected';
      latestQrBase64 = null;
      try {
        const jid = sock.user?.id;
        connectedNumber = jid ? jidNormalizedUser(jid).split('@')[0] : null;
        console.log(`\n🎉 WhatsApp Connected! Number: +${connectedNumber}`);
        console.log('✅ Session saved — no QR needed on next restart.\n');
      } catch (e) {
        console.error('Error reading connected number:', e.message);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const { Boom } = await import('@hapi/boom');
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️  Connection closed. Code: ${statusCode}`);

      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 3 seconds...');
        connectionStatus = 'Initializing';
        latestQrBase64 = null;
        setTimeout(initializeClient, 3000);
      } else {
        // Logged out — clear auth so fresh QR is shown
        console.log('🚪 Logged out from WhatsApp. Clearing session...');
        connectionStatus = 'Disconnected';
        latestQrBase64 = null;
        connectedNumber = null;
        try {
          fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        } catch (e) {}
        console.log('🔄 Restarting for fresh login...');
        setTimeout(initializeClient, 3000);
      }
    }
  });
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

// Root Health Check
app.get('/', (req, res) => {
  res.send('WhatsApp Gateway (Baileys) is running.');
});

// Status — returns QR, connection state, and number
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: latestQrBase64,
    number: connectedNumber,
    publicUrl: publicTunnelUrl ? `${publicTunnelUrl}/messages/chat` : null
  });
});

// Send message (text and/or PDF)
app.post('/messages/chat', async (req, res) => {
  const { to, body, pdf, pdfName } = req.body;

  if (!to || (!body && !pdf)) {
    return res.status(400).json({ success: false, message: 'Missing parameters: to and body/pdf required.' });
  }

  if (connectionStatus !== 'Connected' || !sock) {
    return res.status(503).json({ success: false, message: 'WhatsApp not ready. Please scan the QR code.' });
  }

  // Normalize phone number to WhatsApp JID
  let cleanPhone = to.toString().replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
  const jid = `${cleanPhone}@s.whatsapp.net`;

  try {
    if (body) {
      await sock.sendMessage(jid, { text: body });
      console.log(`✉️  Text sent to +${cleanPhone}`);
    }

    if (pdf) {
      const cleanPdf = pdf.includes(',') ? pdf.split(',')[1] : pdf;
      const pdfBuffer = Buffer.from(cleanPdf, 'base64');
      await sock.sendMessage(jid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: pdfName || 'Invoice.pdf',
      });
      console.log(`📄 PDF sent to +${cleanPhone}`);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Send error:', error.message);
    return res.status(500).json({ success: false, message: `Failed: ${error.message}` });
  }
});

// Disconnect / logout
app.post('/disconnect', async (req, res) => {
  try {
    if (sock) await sock.logout();
  } catch (err) {
    console.error('Logout error:', err.message);
  }
  connectionStatus = 'Disconnected';
  latestQrBase64 = null;
  connectedNumber = null;
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 WhatsApp Gateway running on http://localhost:${PORT}`);
  await startTunnel();
  await initializeClient();
});
