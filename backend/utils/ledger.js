/**
 * Double-Entry Accounting Ledger Helper
 * Writes debit and credit journal entries to chart of accounts ledger
 */

/**
 * Posts a double-entry journal record
 * @param {object} client - pg transaction client
 * @param {object} data
 * @param {string} data.reference_source - e.g., 'loan_disbursement', 'loan_payment', 'expense', 'income'
 * @param {number} data.reference_id - primary key of reference transaction
 * @param {string} data.description - descriptive narration
 * @param {number} data.created_by - user id logging the entry
 * @param {Array} data.lines - array of lines: { account_code, debit, credit }
 */
async function postJournalEntry(client, { reference_source, reference_id, description, created_by, lines }) {
  // 1. Validate that the lines are balanced: Total Debits must equal Total Credits
  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of lines) {
    totalDebits += parseFloat(line.debit || 0);
    totalCredits += parseFloat(line.credit || 0);
  }

  // Handle minor floating point rounding (within 0.01 margin)
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Unbalanced Journal Entry: Debits (Rs.${totalDebits}) do not equal Credits (Rs.${totalCredits})`);
  }

  // 2. Insert master Journal Entry
  const journalResult = await client.query(
    `INSERT INTO journal_entries (reference_source, reference_id, description, created_by) 
     VALUES ($1, $2, $3, $4) RETURNING journal_id`,
    [reference_source, reference_id, description, created_by || null]
  );
  
  const journalId = journalResult.rows[0].journal_id;

  // 3. Insert individual lines
  for (const line of lines) {
    await client.query(
      `INSERT INTO journal_lines (journal_id, account_code, debit, credit) 
       VALUES ($1, $2, $3, $4)`,
      [
        journalId,
        line.account_code,
        parseFloat(line.debit || 0),
        parseFloat(line.credit || 0)
      ]
    );
  }

  console.log(`Successfully logged Double-Entry Journal #${journalId} (${reference_source} ID: ${reference_id})`);
  return journalId;
}

module.exports = { postJournalEntry };
