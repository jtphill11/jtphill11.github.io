// index.js
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Bullride backend is running!');
});

// Test API route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Bullride backend!' });
});

// Contact form route
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  // For now, just log it
  console.log(`Contact submission from ${name} (${email}): ${message}`);

  res.json({ status: 'success', message: 'Thank you for contacting Bullride!' });
});

// Listen on the port assigned by Elastic Beanstalk
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
