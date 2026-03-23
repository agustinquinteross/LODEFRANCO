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
if (!dbUrl) { console.error('DATABASE_URL no encontrada.'); process.exit(1); }

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

// Imágenes de Unsplash por categoría y producto
// Formato: https://images.unsplash.com/photo-[ID]?w=600&fit=crop&q=85
const u = (id) => `https://images.unsplash.com/photo-${id}?w=600&fit=crop&q=85`;

// Mapa: coincidencia parcial (lowercase) en el nombre del producto -> URL de imagen
const IMAGE_MAP = [
  // PIZZAS
  { match: 'mozzarella',          url: u('1565299624596-77c773f2c58e') },
  { match: 'especial',            url: u('1574071318508-1cdbab80d002') },
  { match: 'napolitana',          url: u('1513104890138-7c749659a591') },
  { match: 'calabresa',           url: u('1588347309627-2c09dfa53f44') },
  { match: 'rucula',              url: u('1571407970349-bc81e7e96d47') },
  { match: 'cheddar',             url: u('1593560708920-61dd98c46a4e') },
  { match: 'pizzeta',             url: u('1565299624596-77c773f2c58e') },
  { match: 'pizza',               url: u('1565299624596-77c773f2c58e') }, // fallback pizza

  // HAMBURGUESAS
  { match: 'xxl',                 url: u('1568901346375-23c9450c58cd') },
  { match: 'doble carne',         url: u('1553979459-d1ebb38948e3') },
  { match: 'casera',              url: u('1550547660-d9450f859349') },
  { match: 'paty',                url: u('1610440042665-61a6b08c1e2b') },
  { match: 'cheese bacon',        url: u('1571006682776-f33434e4e48d') },
  { match: 'burger',              url: u('1568901346375-23c9450c58cd') }, // fallback burger

  // LOMOS
  { match: 'lomo',                url: u('1504674900247-0877df9cc836') },

  // MILANESAS
  { match: 'milanesa',            url: u('1598514982901-7e21b7b8dd9f') },
  { match: '2 milanesas',         url: u('1543340904-7bf43c81e81f') },

  // PAPAS
  { match: 'papas fritas',        url: u('1573080496032-d4b03e442c69') },
  { match: 'papas americanas',    url: u('1518013431117-eb1465fa5c7e') },
  { match: 'salchipapas',         url: u('1639024471267-e7f27e9c45b9') },

  // PANCHOS
  { match: 'pancho',              url: u('1617093727343-374698b1b754') },

  // EMPANADAS
  { match: 'empanada',            url: u('1565375620593-ef7e0a451082') },

  // PICADAS
  { match: 'picada',              url: u('1541014831810-8285f33e8b71') },

  // BEBIDAS
  { match: 'coca',                url: u('1554866585-bf678e2a2d0d') },
  { match: 'pepsi',               url: u('1554866585-bf678e2a2d0d') },
  { match: 'gaseosa',             url: u('1620021657280-d1041fca68c1') },
  { match: 'agua',                url: u('1548839140-29a749e1cf4d') },

  // BEBIDAS CON ALCOHOL
  { match: 'fernet',              url: u('1527281400683-1aae777175f8') },
  { match: '2x1 fernet',         url: u('1527281400683-1aae777175f8') },
  { match: 'cerveza',             url: u('1608270586351-342d80baca95') },

  // TOSTADOS
  { match: 'tostado',             url: u('1528735602780-2552fd46c7af') },

  // PROMOS
  { match: 'promo',               url: u('1504674900247-0877df9cc836') },
];

function findImage(productName) {
  const lower = productName.toLowerCase();
  // Ordenar por longitud del match descendente (más específico primero)
  const sorted = [...IMAGE_MAP].sort((a, b) => b.match.length - a.match.length);
  for (const entry of sorted) {
    if (lower.includes(entry.match)) return entry.url;
  }
  return u('1546069901-ba9599a7e63c'); // fallback: comida genérica
}

async function run() {
  console.log('Conectando a Railway PostgreSQL...');
  const { rows: products } = await pool.query('SELECT id, name FROM products');
  console.log(`Actualizando imagenes de ${products.length} productos...`);

  let updated = 0;
  for (const p of products) {
    const imgUrl = findImage(p.name);
    await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [imgUrl, p.id]);
    updated++;
    if (updated % 10 === 0) console.log(`  ${updated}/${products.length}...`);
  }

  console.log(`\nListo! ${updated} productos actualizados con imagenes de Unsplash.`);
  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
