// index.js
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();

// Enable CORS for all requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Configure AWS SES
AWS.config.update({ region: 'us-east-1' }); // SES region
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// Root route
app.get('/', (req, res) => {
  res.send('Bullride backend is running!');
});

// Test API route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Bullride backend!' });
});

// Contact form route
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  const params = {
    Source: 'info@bullride.us',           // verified sender
    Destination: { ToAddresses: ['info@bullride.us'] },
    Message: {
      Subject: { Data: `New Message from ${name} through contact form` },
      Body: {
        Text: { Data: `Name: ${name}\nEmail: ${email}\nMessage: ${message}` },
      },
    },
    ReplyToAddresses: [email],
  };

  try {
    console.log('Sending email with params:', params);  // <-- log params
    const result = await ses.sendEmail(params).promise();
    console.log('SES result:', result);                  // <-- log SES response
    res.json({ status: 'success', message: 'Message sent!' });
  } catch (error) {
    console.error('Error sending email:', error);        // <-- log full error
    res.status(500).json({ status: 'error', message: error.message });
  }
});


// Listen on the port assigned by Elastic Beanstalk
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
