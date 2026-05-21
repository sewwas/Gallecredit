const { pool } = require('../db');

/**
 * Audit Middleware
 * Intercepts mutating requests and logs them to the audit_logs table.
 */
const auditLog = async (req, res, next) => {
  // Only log mutating methods
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const originalSend = res.send;
    
    // Override res.send to capture the response and record ID
    res.send = function (data) {
      let responseBody = {};
      try {
        responseBody = JSON.parse(data);
      } catch (err) {
        responseBody = { rawResponse: data };
      }
      
      // Extract info for logging
      const userId = req.user ? (req.user.user_id || req.user.userId) : null;
      const action = req.method;
      const urlParts = req.originalUrl.split('/');
      const tableName = urlParts[2] || 'unknown'; // assuming /api/:table
      
      // Record ID often comes back in the response for POST or is in params for PUT/DELETE
      let recordId = req.params.id || responseBody.customer_id || responseBody.loan_id || responseBody.transaction_id || null;

      // Log asynchronously to not block the response
      pool.query(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          userId,
          action,
          tableName,
          recordId,
          action === 'PUT' ? 'Updated record' : null, // Simplification: we'd need a separate query for true old_value
          JSON.stringify(req.body)
        ]
      ).catch(err => console.error('Audit Log Error:', err));

      return originalSend.apply(res, arguments);
    };
  }
  
  next();
};

module.exports = { auditLog };
