const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

// 1. Get all vaults (Admin/Accountant only)
router.get('/', authorizeRole('admin', 'accountant'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cv.*, u.name as staff_name 
      FROM cash_vaults cv
      LEFT JOIN users u ON cv.assigned_user_id = u.user_id
      ORDER BY cv.type ASC, cv.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get my drawer (Any authenticated staff)
router.get('/my-drawer', async (req, res) => {
  const userId = req.user.userId;
  try {
    let result = await pool.query("SELECT * FROM cash_vaults WHERE assigned_user_id = $1 AND type = 'STAFF'", [userId]);
    
    if (result.rows.length === 0) {
      // Auto-create staff drawer if it doesn't exist
      const insertRes = await pool.query(
        "INSERT INTO cash_vaults (name, type, assigned_user_id, current_balance) VALUES ($1, 'STAFF', $2, 0.00) RETURNING *",
        [`Collector ${req.user.username} Drawer`, userId]
      );
      result = insertRes;
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Submit a handover request (Collector)
router.post('/handover', async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.userId;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid handover amount is required' });
  }

  const handoverAmount = parseFloat(amount);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find and lock the sender staff vault
    let staffVaultQuery = await client.query(
      "SELECT * FROM cash_vaults WHERE assigned_user_id = $1 AND type = 'STAFF' FOR UPDATE",
      [userId]
    );

    if (staffVaultQuery.rows.length === 0) {
      // Create if missing
      const insertRes = await client.query(
        "INSERT INTO cash_vaults (name, type, assigned_user_id, current_balance) VALUES ($1, 'STAFF', $2, 0.00) RETURNING *",
        [`Collector ${req.user.username} Drawer`, userId]
      );
      staffVaultQuery = insertRes;
    }

    const staffVault = staffVaultQuery.rows[0];

    if (parseFloat(staffVault.current_balance) < handoverAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient funds in drawer for handover' });
    }

    // Find central main vault
    const mainVaultQuery = await client.query("SELECT vault_id FROM cash_vaults WHERE type = 'MAIN' LIMIT 1");
    if (mainVaultQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Branch main vault not configured' });
    }
    const mainVaultId = mainVaultQuery.rows[0].vault_id;

    // Log pending handover
    const result = await client.query(
      `INSERT INTO cash_handovers (from_vault_id, to_vault_id, amount, submitted_by_id, status) 
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [staffVault.vault_id, mainVaultId, handoverAmount, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// 4. Get pending handovers (Admin/Accountant only)
router.get('/handovers/pending', authorizeRole('admin', 'accountant'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ch.*, 
             u1.name as submitter_name,
             v1.name as from_vault_name,
             v2.name as to_vault_name
      FROM cash_handovers ch
      JOIN cash_vaults v1 ON ch.from_vault_id = v1.vault_id
      JOIN cash_vaults v2 ON ch.to_vault_id = v2.vault_id
      JOIN users u1 ON ch.submitted_by_id = u1.user_id
      WHERE ch.status = 'pending'
      ORDER BY ch.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Resolve handover: Approve or Reject (Admin/Accountant only)
router.post('/handovers/:id/resolve', authorizeRole('admin', 'accountant'), async (req, res) => {
  const handoverId = req.params.id;
  const { action } = req.body; // 'approved' or 'rejected'
  const resolverId = req.user.userId;

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: "Invalid action. Must be 'approved' or 'rejected'" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve and lock the handover record
    const handoverQuery = await client.query(
      'SELECT * FROM cash_handovers WHERE handover_id = $1 FOR UPDATE',
      [handoverId]
    );
    const handover = handoverQuery.rows[0];

    if (!handover) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Handover record not found' });
    }

    if (handover.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Handover is already resolved' });
    }

    if (action === 'approved') {
      const amount = parseFloat(handover.amount);

      // Lock vaults to avoid deadlocks (order vaults by ID)
      const firstId = Math.min(handover.from_vault_id, handover.to_vault_id);
      const secondId = Math.max(handover.from_vault_id, handover.to_vault_id);

      await client.query('SELECT current_balance FROM cash_vaults WHERE vault_id = $1 FOR UPDATE', [firstId]);
      await client.query('SELECT current_balance FROM cash_vaults WHERE vault_id = $2 FOR UPDATE', [secondId]);

      // Deduct from sender staff vault
      const deductQuery = await client.query(
        'UPDATE cash_vaults SET current_balance = current_balance - $1 WHERE vault_id = $2 RETURNING current_balance',
        [amount, handover.from_vault_id]
      );
      if (parseFloat(deductQuery.rows[0].current_balance) < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient funds in collector drawer' });
      }

      // Add to receiver central vault
      await client.query(
        'UPDATE cash_vaults SET current_balance = current_balance + $1 WHERE vault_id = $2',
        [amount, handover.to_vault_id]
      );

      // Update handover status to approved
      await client.query(
        `UPDATE cash_handovers 
         SET status = 'approved', approved_by_id = $1, resolved_at = CURRENT_TIMESTAMP 
         WHERE handover_id = $2`,
        [resolverId, handoverId]
      );

      // Post Double-Entry Journal Entry
      try {
        const { postJournalEntry } = require('../utils/ledger');
        await postJournalEntry(client, {
          reference_source: 'cash_handover',
          reference_id: handoverId,
          description: `Approved cash handover of Rs.${amount} from collector drawer to branch safe`,
          created_by: resolverId,
          lines: [
            { account_code: '1100', debit: amount, credit: 0 },  // Debit Branch Main Cash Safe
            { account_code: '1300', debit: 0, credit: amount }   // Credit Staff Drawers
          ]
        });
      } catch (ledgerErr) {
        console.error('Ledger handover post failed:', ledgerErr.message);
      }
    } else {
      // Just mark as rejected
      await client.query(
        `UPDATE cash_handovers 
         SET status = 'rejected', approved_by_id = $1, resolved_at = CURRENT_TIMESTAMP 
         WHERE handover_id = $2`,
        [resolverId, handoverId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: `Handover ${action} successfully` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
