const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool } = require('./index');

async function resetDatabase() {
  const client = await pool.connect();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  const backupUploadsDir = path.join(backupDir, `uploads_${timestamp}`);
  const backupFile = path.join(backupDir, `db_backup_${timestamp}.json`);
  const uploadsDir = path.join(__dirname, '../uploads');

  try {
    console.log('====================================================');
    console.log('🚀 FRESH DATABASE RESET: ADMIN & STAFF PRESERVED');
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log('====================================================\n');

    // ----------------------------------------------------
    // STEP 1: COMPLETE DATABASE BACKUP BEFORE DELETION
    // ----------------------------------------------------
    console.log('📦 Step 1: Performing Safety Backup...');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const backupData = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    for (const row of tableRes.rows) {
      const tableName = row.table_name;
      const dataRes = await client.query(`SELECT * FROM "${tableName}"`);
      backupData.tables[tableName] = dataRes.rows;
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`✅ Snapshot saved to: ${backupFile}\n`);

    // Backup uploaded documents
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
      if (files.length > 0) {
        fs.mkdirSync(backupUploadsDir, { recursive: true });
        for (const file of files) {
          fs.copyFileSync(path.join(uploadsDir, file), path.join(backupUploadsDir, file));
        }
        console.log(`✅ Uploaded files backed up (${files.length} files)\n`);
      }
    }

    // ----------------------------------------------------
    // STEP 2: TRANSACTIONAL PURGE OF OPERATIONAL DATA
    // ----------------------------------------------------
    console.log('🧹 Step 2: Purging All Transactional & Operational Tables...');
    await client.query('BEGIN');

    const tablesToTruncate = [
      'payments',
      'installments',
      'loans',
      'guarantors',
      'customer_notes',
      'customer_documents',
      'customers',
      'expenses',
      'income',
      'cash_book',
      'audit_logs',
      'day_closes',
      'cash_handovers',
      'loan_status_history',
      'journal_lines',
      'journal_entries'
    ];

    await client.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} RESTART IDENTITY CASCADE`);
    console.log(`✅ Truncated ${tablesToTruncate.length} operational tables with RESTART IDENTITY.`);

    // ----------------------------------------------------
    // STEP 3: PRESERVE & RESTORE ADMIN AND STAFF USERS
    // ----------------------------------------------------
    console.log('\n👥 Step 3: Retaining Admin & Staff Users...');

    // Known staff accounts to ensure are present and active
    const staffMembers = [
      {
        user_id: 14,
        name: 'Sandaru',
        role: 'staff',
        username: 'Sandaru',
        password_hash: '$2b$10$gIR8GR9EM9f6mpYyszF0/.ksh7Vvs6m3ceuuxKk7Fy.rhOp09JbES',
        is_active: true
      },
      {
        user_id: 15,
        name: 'KA Rajith',
        role: 'staff',
        username: 'Rajith1000',
        password_hash: '$2b$10$d9zfFNm0CHDvzs/Q.YHP5.2dMAy5B9Jlm7y8mA7vWW0/Q.3xUaWJm',
        is_active: true
      },
      {
        user_id: 16,
        name: 'Udara Sampath',
        role: 'staff',
        username: 'Udara1001',
        password_hash: '$2b$10$4htMhwdvC60jc4G.lkJqRug..LmEKZaZAdsBdcpOH.61Fknhvd1/e',
        is_active: true
      }
    ];

    // Ensure Admin user
    const adminCheck = await client.query("SELECT * FROM users WHERE username = 'gallecredit@gmail.com'");
    let adminId = 2;
    if (adminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('CreditGalle2025', 10);
      const insertAdmin = await client.query(`
        INSERT INTO users (name, role, username, password_hash, is_active)
        VALUES ('Galle Credit Admin', 'admin', 'gallecredit@gmail.com', $1, true)
        RETURNING user_id
      `, [passwordHash]);
      adminId = insertAdmin.rows[0].user_id;
      console.log('   - Admin created: gallecredit@gmail.com');
    } else {
      adminId = adminCheck.rows[0].user_id;
      await client.query(`
        UPDATE users 
        SET is_active = TRUE, role = 'admin'
        WHERE username = 'gallecredit@gmail.com'
      `);
      console.log('   - Admin verified: gallecredit@gmail.com');
    }

    // Ensure staff users exist
    for (const staff of staffMembers) {
      const staffCheck = await client.query('SELECT * FROM users WHERE username = $1', [staff.username]);
      if (staffCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO users (user_id, name, role, username, password_hash, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (username) DO UPDATE 
          SET name = EXCLUDED.name, role = EXCLUDED.role, is_active = TRUE
        `, [staff.user_id, staff.name, staff.role, staff.username, staff.password_hash, staff.is_active]);
        console.log(`   - Staff added/restored: ${staff.name} (@${staff.username})`);
      } else {
        await client.query('UPDATE users SET is_active = TRUE WHERE username = $1', [staff.username]);
        console.log(`   - Staff verified: ${staff.name} (@${staff.username})`);
      }
    }

    // Remove any unwanted users that are neither the admin nor known staff
    const validUsernames = ['gallecredit@gmail.com', ...staffMembers.map(s => s.username)];
    const delUnwanted = await client.query(`
      DELETE FROM users 
      WHERE NOT (username = ANY($1::text[]))
    `, [validUsernames]);
    if (delUnwanted.rowCount > 0) {
      console.log(`   - Removed ${delUnwanted.rowCount} unwanted user(s).`);
    }

    // Update users_user_id_seq to prevent primary key collision
    await client.query(`
      SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1), true)
    `);

    // ----------------------------------------------------
    // STEP 4: CASH VAULTS & DRAWERS (CLEANUP UNWANTED)
    // ----------------------------------------------------
    console.log('\n🏦 Step 4: Configuring Cash Vaults...');

    // Delete unwanted dummy test drawers (e.g. unassigned drawers or drawers from deleted test users)
    await client.query(`
      DELETE FROM cash_vaults 
      WHERE type = 'STAFF' AND (assigned_user_id IS NULL OR assigned_user_id NOT IN (SELECT user_id FROM users))
    `);
    console.log('   - Removed orphan & unwanted test drawers.');

    // Reset Central Branch Safe
    const mainVault = await client.query("SELECT * FROM cash_vaults WHERE type = 'MAIN'");
    if (mainVault.rows.length === 0) {
      await client.query(`
        INSERT INTO cash_vaults (name, type, current_balance)
        VALUES ('Central Branch Safe', 'MAIN', 0.00)
      `);
      console.log('   - Central Branch Safe created with 0.00 balance.');
    } else {
      await client.query(`
        UPDATE cash_vaults 
        SET current_balance = 0.00, assigned_user_id = NULL
        WHERE type = 'MAIN'
      `);
      console.log('   - Central Branch Safe balance reset to 0.00.');
    }

    // Ensure each active staff has a clean drawer with 0.00 balance
    const activeStaff = await client.query("SELECT user_id, name, username FROM users WHERE role = 'staff'");
    for (const staff of activeStaff.rows) {
      const drawerCheck = await client.query('SELECT * FROM cash_vaults WHERE assigned_user_id = $1', [staff.user_id]);
      if (drawerCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO cash_vaults (name, type, assigned_user_id, current_balance)
          VALUES ($1, 'STAFF', $2, 0.00)
        `, [`Collector ${staff.username} Drawer`, staff.user_id]);
        console.log(`   - Created fresh drawer (0.00) for ${staff.name}`);
      } else {
        await client.query(`
          UPDATE cash_vaults 
          SET current_balance = 0.00, name = $1
          WHERE assigned_user_id = $2
        `, [`Collector ${staff.username} Drawer`, staff.user_id]);
        console.log(`   - Reset drawer balance to 0.00 for ${staff.name}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉 SQL Transaction successfully committed!');

    // ----------------------------------------------------
    // STEP 5: PHYSICAL UPLOADS DIRECTORY CLEANUP
    // ----------------------------------------------------
    console.log('\n🧹 Step 5: Cleaning Unwanted Uploaded Files...');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let count = 0;
      for (const file of files) {
        if (!file.startsWith('.')) {
          fs.unlinkSync(path.join(uploadsDir, file));
          count++;
        }
      }
      console.log(`✅ Cleaned ${count} unwanted upload file(s).`);
    }

    // ----------------------------------------------------
    // STEP 6: VERIFICATION SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log('📊 DATABASE STATUS SUMMARY (ADMIN & STAFF KEPT)');
    console.log('====================================================');

    for (const row of tableRes.rows) {
      const tableName = row.table_name;
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      const mark = count === 0 ? '✨ 0 rows (CLEAN)' : `📌 ${count} rows`;
      console.log(`   ${tableName.padEnd(25)} : ${mark}`);
    }

    const currentUsers = await client.query('SELECT user_id, name, role, username FROM users ORDER BY user_id');
    console.log('\n👥 Active System Users Preserved:');
    for (const u of currentUsers.rows) {
      console.log(`   - [${u.role.toUpperCase()}] ${u.name} (@${u.username}) (ID: ${u.user_id})`);
    }

    const currentVaults = await client.query('SELECT vault_id, name, type, current_balance FROM cash_vaults ORDER BY vault_id');
    console.log('\n🏦 Cash Vaults & Drawers Ready:');
    for (const v of currentVaults.rows) {
      console.log(`   - [${v.type}] ${v.name} : Balance Rs ${parseFloat(v.current_balance).toFixed(2)}`);
    }

    console.log('\n====================================================');
    console.log('✅ ALL UNWANTED DATA DELETED. SYSTEM IS CLEAN & READY!');
    console.log('====================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reset failed! Rolled back transaction:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Script terminated with error:', err);
  process.exit(1);
});
