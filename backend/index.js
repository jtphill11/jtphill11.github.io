// ---------- Core Setup ----------
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const http = require('http');
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'https://bullride.us', credentials: true }));
app.use(express.json());

// ---------- AWS SES ----------
AWS.config.update({ region: 'us-east-1' });
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// ---------- Base Routes ----------
app.get('/', (req, res) => res.send('Bullride backend is running!'));
app.get('/api', (req, res) => res.json({ message: 'Hello from Bullride backend!' }));

// ---------- Contact Form ----------
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  const params = {
    Source: 'info@bullride.us',
    Destination: { ToAddresses: ['info@bullride.us'] },
    Message: {
      Subject: { Data: `New Message from ${name}` },
      Body: { Text: { Data: `Name: ${name}\nEmail: ${email}\nMessage: ${message}` } },
    },
    ReplyToAddresses: [email],
  };
  try {
    await ses.sendEmail(params).promise();
    res.json({ status: 'success', message: 'Message sent!' });
  } catch (err) {
    console.error('SES error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ---------- API Routes ----------
const alpacaRoutes = require('./routes/alpaca');
const basketRoutes = require('./routes/baskets');
app.use('/api/stocks', alpacaRoutes);
app.use('/api/baskets', basketRoutes);

// ---------- WebSocket Admin Chat Setup ----------
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const adminClients = new Set();

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(url.parse(req.url).query);
  const token = params.get('token');
  let email = 'unknown';

  try {
    const decoded = jwt.decode(token);
    email = decoded?.email || 'unknown';

    // Restrict to Bullride admins only
    if (!email.endsWith('@bullride.us')) {
      ws.send(JSON.stringify({ system: 'Access denied: not an admin.' }));
      ws.close();
      return;
    }
  } catch (e) {
    ws.send(JSON.stringify({ system: 'Invalid token.' }));
    ws.close();
    return;
  }

  adminClients.add(ws);
  console.log(`${email} connected to admin chat.`);

  // Notify all admins when someone joins
  const joinMsg = JSON.stringify({ system: `${email} joined the chat.` });
  for (const client of adminClients) {
    if (client.readyState === 1) client.send(joinMsg);
  }

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const payload = {
        sender: email.split('@')[0],
        text: msg.text,
      };

      // Broadcast to all connected admins
      for (const client of adminClients) {
        if (client.readyState === 1) {
          client.send(JSON.stringify(payload));
        }
      }

      console.log(`${email}: ${msg.text}`);
    } catch (err) {
      console.error('Error handling chat message:', err);
    }
  });

  // Handle disconnects
  ws.on('close', () => {
    adminClients.delete(ws);
    console.log(`${email} disconnected.`);
    const leaveMsg = JSON.stringify({ system: `${email} left the chat.` });
    for (const client of adminClients) {
      if (client.readyState === 1) client.send(leaveMsg);
    }
  });
});

// ---------- Start HTTP + WebSocket Server ----------
const port = process.env.PORT || 8080;
server.listen(port, () => console.log(`API + WebSocket server running on port ${port}`));
