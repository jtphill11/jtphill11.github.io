// routes/baskets.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE = 'baskets';

// Create a new basket
router.post('/create', async (req, res) => {
  try {
    const { userEmail, name, stocks } = req.body;
    if (!userEmail || !stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return res.status(400).json({ error: 'Invalid basket data' });
    }

    const item = {
      basketId: uuidv4(),
      userEmail,
      name: name || 'Untitled Basket',
      stocks, // [{symbol, shares, price}]
      createdAt: new Date().toISOString(),
      active: true,
    };

    await dynamo.put({ TableName: TABLE, Item: item }).promise();
    res.json({ success: true, basket: item });
  } catch (err) {
    console.error('Create basket error:', err);
    res.status(500).json({ error: 'Failed to create basket' });
  }
});

// Get baskets for a user
router.get('/user', async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).json({ error: 'Missing email' });

  try {
    const data = await dynamo.scan({ TableName: TABLE }).promise();
    const baskets = data.Items.filter(b => b.userEmail === userEmail);
    res.json(baskets);
  } catch (err) {
    console.error('Fetch user baskets error:', err);
    res.status(500).json({ error: 'Failed to fetch baskets' });
  }
});

// Get all baskets (Explore)
router.get('/explore', async (_req, res) => {
  try {
    const data = await dynamo.scan({ TableName: TABLE }).promise();
    res.json(data.Items);
  } catch (err) {
    console.error('Explore fetch error:', err);
    res.status(500).json({ error: 'Failed to load explore baskets' });
  }
});

// Delete basket
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dynamo.update({
      TableName: TABLE,
      Key: { basketId: id },
      UpdateExpression: 'set active = :a',
      ExpressionAttributeValues: { ':a': false },
    }).promise();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete basket error:', err);
    res.status(500).json({ error: 'Failed to delete basket' });
  }
});

module.exports = router;
