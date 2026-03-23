const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const match = envContent.match(/DATABASE_URL=(.*)/);
    if (match) dbUrl = match[1].trim();
  } catch(e) {}
}
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  const { rows: orders } = await pool.query(`
    SELECT o.id, o.customer_name, o.status, o.total, o.created_at,
           COUNT(i.id) as item_count
    FROM orders o
    LEFT JOIN order_items i ON i.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 20
  `);
  
  console.log(`Total pedidos: ${orders.length}`);
  console.log('');
  orders.forEach(o => {
    console.log(`  #${o.id} | ${o.status.padEnd(10)} | $${o.total} | ${o.customer_name} | ${new Date(o.created_at).toLocaleString('es-AR')} | ${o.item_count} items`);
  });

  await pool.end();
}
run().catch(e => console.error(e.message));
