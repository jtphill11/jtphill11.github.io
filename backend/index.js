const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'https://bullride.us', credentials: true }));
app.use(express.json());

// ---------- AWS SES ----------
AWS.config.update({ region: 'us-east-1' });
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// Root + Test
app.get('/', (req, res) => res.send('Bullride backend is running!'));
app.get('/api', (req, res) => res.json({ message: 'Hello from Bullride backend!' }));

// Contact form
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

// ---------- New routes ----------
const alpacaRoutes = require('./routes/alpaca');
const basketRoutes = require('./routes/baskets');
app.use('/api/stocks', alpacaRoutes);
app.use('/api/baskets', basketRoutes);

// ---------- Beanstalk port ----------
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
