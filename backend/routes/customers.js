const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { supabase } = require('../utils/supabaseClient');

// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

// ... existing routes ...

// Upload a document
router.post('/:id/documents', upload.single('document'), async (req, res) => {
  const customerId = req.params.id;
  const { document_type } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No document file provided' });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload document to storage' });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filename);
      
    const publicUrl = publicUrlData.publicUrl;

    const result = await pool.query(
      'INSERT INTO customer_documents (customer_id, document_type, file_name, file_path) VALUES ($1, $2, $3, $4) RETURNING *',
      [customerId, document_type, filename, publicUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer documents
router.get('/:id/documents', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer_documents WHERE customer_id = $1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single customer
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a customer
router.post('/', async (req, res) => {
  const { name, nic, phone, address, kyc_status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, nic, phone, address, kyc_status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, nic, phone, address, kyc_status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'NIC already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a customer
router.put('/:id', async (req, res) => {
  const { name, nic, phone, address, kyc_status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name = $1, nic = $2, phone = $3, address = $4, kyc_status = $5 WHERE customer_id = $6 RETURNING *',
      [name, nic, phone, address, kyc_status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE customer_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
