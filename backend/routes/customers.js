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

    // Use Signed URL for better privacy instead of Public URL
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrl(filename, 60 * 60);
      
    const fileUrl = signedData?.signedUrl || '';

    const result = await pool.query(
      'INSERT INTO customer_documents (customer_id, document_type, file_name, file_path) VALUES ($1, $2, $3, $4) RETURNING *',
      [customerId, document_type, filename, fileUrl]
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
    
    // Refresh signed URLs for all documents
    const documents = await Promise.all(result.rows.map(async (doc) => {
      if (doc.file_name) {
        const { data } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.file_name, 60 * 60);
        
        if (data && data.signedUrl) {
          doc.file_path = data.signedUrl;
        }
      }
      return doc;
    }));

    res.json(documents);
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

// Get a single customer's full audit profile
router.get('/:id/audit', async (req, res) => {
  try {
    const customerId = req.params.id;

    // 1. Get basic customer info
    const customerQuery = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
    if (customerQuery.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    const customer = customerQuery.rows[0];

    // 2. Get all loans for this customer including Guarantor info
    const loansQuery = await pool.query(`
      SELECT 
        l.loan_id, l.loan_code, l.loan_amount, l.total_amount, l.issue_date, l.due_date, 
        l.status, l.loan_type, l.interest_rate,
        g.name AS guarantor_name, g.phone AS guarantor_phone,
        COALESCE((SELECT SUM(paid_amount) FROM installments WHERE loan_id = l.loan_id), 0) as total_paid,
        (l.total_amount - COALESCE((SELECT SUM(paid_amount) FROM installments WHERE loan_id = l.loan_id), 0)) as outstanding_balance
      FROM loans l
      LEFT JOIN guarantors g ON g.loan_id = l.loan_id
      WHERE l.customer_id = $1
      ORDER BY l.issue_date DESC, l.loan_id DESC
    `, [customerId]);

    const loans = loansQuery.rows;

    // 3. Get customer notes
    const notesQuery = await pool.query(`
      SELECT n.note_id, n.note, n.created_at, u.username as created_by
      FROM customer_notes n
      LEFT JOIN users u ON u.user_id = n.created_by_id
      WHERE n.customer_id = $1
      ORDER BY n.created_at DESC
    `, [customerId]);
    const notes = notesQuery.rows;

    // 4. Calculate overdue amount and days for each active loan
    let total_overdue_amount = 0;
    let active_loans_count = 0;
    let maxOverallOverdueDays = 0;
    let completed_loans_count = 0;

    for (let loan of loans) {
      if (loan.status === 'paid' || loan.status === 'completed') {
        completed_loans_count++;
      }

      if (loan.status === 'disbursed') {
        active_loans_count++;
        
        // Find overdue installments for this specific loan
        const overdueInstQuery = await pool.query(`
          SELECT amount, paid_amount, due_date
          FROM installments
          WHERE loan_id = $1 AND status != 'paid' AND due_date <= CURRENT_DATE
        `, [loan.loan_id]);

        let loanOverdueAmount = 0;
        let maxOverdueDays = 0;

        overdueInstQuery.rows.forEach(inst => {
          const remaining = parseFloat(inst.amount) - parseFloat(inst.paid_amount || 0);
          loanOverdueAmount += remaining;
          
          const due = new Date(inst.due_date);
          const today = new Date();
          const diffTime = Math.abs(today - due);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > maxOverdueDays) maxOverdueDays = diffDays;
        });

        loan.overdue_amount = loanOverdueAmount;
        loan.overdue_days = maxOverdueDays;
        
        total_overdue_amount += loanOverdueAmount;
        if (maxOverdueDays > maxOverallOverdueDays) {
          maxOverallOverdueDays = maxOverdueDays;
        }
      } else {
        loan.overdue_amount = 0;
        loan.overdue_days = 0;
      }
    }

    // Calculate Trust Score
    let trust_score = 'A';
    if (maxOverallOverdueDays > 90) trust_score = 'D';
    else if (maxOverallOverdueDays > 30) trust_score = 'C';
    else if (maxOverallOverdueDays > 0) trust_score = 'B';
    else if (completed_loans_count === 0 && active_loans_count === 0) trust_score = 'N/A';
    else trust_score = 'A';

    res.json({
      customer,
      loans,
      notes,
      audit_summary: {
        total_loans: loans.length,
        active_loans: active_loans_count,
        total_overdue_amount,
        trust_score
      }
    });

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

// Add a follow-up note for a customer
router.post('/:id/notes', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { note } = req.body;
    const userId = req.user ? (req.user.user_id || req.user.userId) : null;
    
    if (!note) return res.status(400).json({ error: 'Note is required' });

    const result = await pool.query(
      'INSERT INTO customer_notes (customer_id, note, created_by_id) VALUES ($1, $2, $3) RETURNING *',
      [customerId, note, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add Note Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send SMS Reminder
router.post('/:id/remind', async (req, res) => {
  try {
    const customerId = req.params.id;
    const { overdue_amount } = req.body;
    
    // Get customer phone
    const custQuery = await pool.query('SELECT name, phone FROM customers WHERE customer_id = $1', [customerId]);
    if (custQuery.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    
    const { name, phone } = custQuery.rows[0];
    if (!phone) return res.status(400).json({ error: 'Customer has no phone number' });

    const { sendSMS } = require('../utils/sms');
    const message = `Dear ${name}, this is a reminder from Cashon that you have an overdue balance of Rs.${overdue_amount}. Please make a payment as soon as possible.`;
    
    await sendSMS(phone, message);
    
    // Optional: Log it as a note automatically
    const userId = req.user ? (req.user.user_id || req.user.userId) : null;
    await pool.query(
      'INSERT INTO customer_notes (customer_id, note, created_by_id) VALUES ($1, $2, $3)',
      [customerId, `Sent SMS Reminder for Rs.${overdue_amount}`, userId]
    );

    res.json({ success: true, message: 'Reminder sent' });
  } catch (err) {
    console.error('Send Reminder Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Create a customer
router.post('/', async (req, res) => {
  const { name, nic, phone, address, kyc_status, location, location_code, application_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, nic, phone, address, kyc_status, location, location_code, application_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, nic, phone, address, kyc_status || 'pending', location || 'Galle', location_code || 'GL', application_id || null]
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
  const { name, nic, phone, address, kyc_status, location, location_code, application_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name = $1, nic = $2, phone = $3, address = $4, kyc_status = $5, location = $6, location_code = $7, application_id = $8 WHERE customer_id = $9 RETURNING *',
      [name, nic, phone, address, kyc_status, location || 'Galle', location_code || 'GL', application_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'NIC already exists' });
    }
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
