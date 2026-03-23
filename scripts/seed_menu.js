const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Leer DATABASE_URL del .env
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const match = envContent.match(/DATABASE_URL=(.*)/);
    if (match) dbUrl = match[1].trim();
  } catch(e) {}
}
if (!dbUrl) { console.error('❌ DATABASE_URL no encontrada.'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const CATEGORIES = [
  'Pizzas', 'Hamburguesas', 'Lomos', 'Milanesas', 'Al Plato',
  'Papas', 'Panchos', 'Empanadas', 'Picadas', 'Bebidas', 'Bebidas con Alcohol', 'Tostados'
];

// [nombre, precio, categoría]
const PRODUCTS = [
  // PIZZAS
  ['Pizza Mozzarella', 8500, 'Pizzas'],
  ['Pizza Especial', 9500, 'Pizzas'],
  ['Pizza Napolitana', 9500, 'Pizzas'],
  ['Pizza Calabresa', 9500, 'Pizzas'],
  ['Pizza Rucula con Jamon', 10000, 'Pizzas'],
  ['Pizza Rucula con Panceta', 10000, 'Pizzas'],
  ['Pizza Cheddar y Lomo', 11000, 'Pizzas'],
  ['Pizza Cheddar y Panceta', 11000, 'Pizzas'],
  ['Pizza Cheddar y Huevo', 11000, 'Pizzas'],
  ['PROMO: 2 Mozzas', 22000, 'Pizzas'],
  ['PROMO: 6 Pizzetas + Lata Pepsi', 9500, 'Pizzas'],
  // HAMBURGUESAS
  ['Burger XXL Master', 19900, 'Hamburguesas'],
  ['Burger XXL Pecadora', 19900, 'Hamburguesas'],
  ['Burger XXL Cheese Bacon', 19900, 'Hamburguesas'],
  ['Burger Paty XL Bacon', 13000, 'Hamburguesas'],
  ['Burger Paty XL Americana', 13000, 'Hamburguesas'],
  ['Burger Paty XL Especial', 13000, 'Hamburguesas'],
  ['Burger Paty XL Express', 13000, 'Hamburguesas'],
  ['Burger Casera Comun', 15000, 'Hamburguesas'],
  ['Burger Casera Cheese', 15000, 'Hamburguesas'],
  ['Burger Casera Bacon', 15000, 'Hamburguesas'],
  ['Burger Casera Americana', 15000, 'Hamburguesas'],
  ['Burger Doble Carne Cheese Bacon', 17000, 'Hamburguesas'],
  ['Burger Doble Carne Especial', 17000, 'Hamburguesas'],
  ['PROMO: Cheese Bacon Doble + Pepsi', 16000, 'Hamburguesas'],
  // LOMOS
  ['Lomo Comun', 16000, 'Lomos'],
  ['Lomo Especial', 17000, 'Lomos'],
  ['Lomo Americano', 17000, 'Lomos'],
  ['Lomo Express', 17000, 'Lomos'],
  // MILANESAS
  ['2 Milanesas de Pollo (25% OFF)', 24000, 'Milanesas'],
  ['Milanesa de Carne Comun', 15000, 'Milanesas'],
  ['Milanesa de Carne Napolitana', 16000, 'Milanesas'],
  ['Milanesa de Carne a Caballo', 18000, 'Milanesas'],
  ['Milanesa de Pollo Comun', 15000, 'Milanesas'],
  ['Milanesa de Pollo Napolitana', 16000, 'Milanesas'],
  // AL PLATO
  ['Picada + 6 Pizzetas', 23000, 'Al Plato'],
  // PAPAS
  ['Papas Fritas 1/2 kg', 7000, 'Papas'],
  ['Papas Americanas 750g', 8500, 'Papas'],
  ['Salchipapas 750g', 9000, 'Papas'],
  // PANCHOS
  ['Pancho Simple', 2800, 'Panchos'],
  ['Pancho Pizza', 3500, 'Panchos'],
  ['PROMO: Pancho + Papas + Pepsi', 4200, 'Panchos'],
  // EMPANADAS
  ['Empanada (unidad)', 2000, 'Empanadas'],
  ['Docena de Empanadas', 12000, 'Empanadas'],
  ['Docena Empanadas Carne a Cuchillo', 13000, 'Empanadas'],
  // PICADAS
  ['Picada + 6 Pizzetas', 23000, 'Picadas'],
  // BEBIDAS
  ['Coca-Cola / Pepsi 1.5L', 6800, 'Bebidas'],
  ['Coca-Cola / Pepsi 2L', 6800, 'Bebidas'],
  ['Gaseosa Lata', 2500, 'Bebidas'],
  ['Agua Mineral', 2000, 'Bebidas'],
  // BEBIDAS CON ALCOHOL
  ['Fernet Individual', 6000, 'Bebidas con Alcohol'],
  ['PROMO: 2x1 Fernet', 9000, 'Bebidas con Alcohol'],
  ['Cerveza Quilmes', 3500, 'Bebidas con Alcohol'],
  ['Cerveza Budweiser', 3500, 'Bebidas con Alcohol'],
  ['Cerveza Salta', 3500, 'Bebidas con Alcohol'],
  // TOSTADOS
  ['Tostado Simple', 10000, 'Tostados'],
  ['Tostado Especial', 12000, 'Tostados'],
];

async function run() {
  console.log('Conectando a Railway PostgreSQL...');
  
  // 1. Insertar categorías (seguro, una por vez con WHERE NOT EXISTS)
  console.log('Insertando categorias...');
  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    await pool.query(
      `INSERT INTO categories (name, sort_order) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = $1)`,
      [cat, (i + 1) * 10]
    );
  }
  console.log('Categorias OK');

  // 2. Obtener mapa de categorías
  const { rows: catRows } = await pool.query('SELECT id, name FROM categories');
  const catMap = {};
  catRows.forEach(r => catMap[r.name] = r.id);

  // 3. Insertar productos (seguro, solo si no existe el nombre en esa categoría)
  console.log('Insertando productos...');
  let inserted = 0;
  for (const [name, price, catName] of PRODUCTS) {
    const catId = catMap[catName];
    if (!catId) { console.warn(`Categoria no encontrada: ${catName}`); continue; }
    const res = await pool.query(
      `INSERT INTO products (name, price, category_id, is_active) SELECT $1, $2, $3, true WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = $1 AND category_id = $3) RETURNING id`,
      [name, price, catId]
    );
    if (res.rowCount > 0) inserted++;
  }
  console.log(`Productos insertados: ${inserted} / ${PRODUCTS.length}`);

  // 4. Resumen
  const { rows } = await pool.query(`
    SELECT c.name AS categoria, COUNT(p.id) AS productos
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.name ORDER BY c.name
  `);
  console.log('\nResumen final:');
  rows.forEach(r => console.log(`  ${r.categoria}: ${r.productos} productos`));

  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
