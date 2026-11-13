const express = require('express');
const { listItems, createItem, updateItem, deleteItem } = require('../db/store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All item CRUD routes require authentication & scope strictly to req.user.id
router.use(requireAuth);

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const items = await listItems(req.user.id);
    return res.json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch items.' });
  }
});

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const { title, description, ai_summary, category, score, distance } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const created = await createItem(req.user.id, {
      title,
      description,
      ai_summary,
      category,
      score,
      distance
    });
    return res.status(201).json({ item: created });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create item.' });
  }
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await updateItem(req.user.id, req.params.id, req.body || {});
    return res.json({ item: updated });
  } catch (err) {
    return res.status(404).json({ error: err.message || 'Failed to update item.' });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteItem(req.user.id, req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: err.message || 'Failed to delete item.' });
  }
});

module.exports = router;
