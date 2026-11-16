// Servidor local para desarrollo (sin dependencias).
// Uso: npm run dev   → http://localhost:8080   (PUERTO=3000 npm run dev)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const PUERTO = Number(process.env.PUERTO) || 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let archivo = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    if (!archivo.startsWith(RAIZ + path.sep) && archivo !== RAIZ) {
      res.writeHead(403).end('Prohibido');
      return;
    }
    if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory())
      archivo = path.join(archivo, 'index.html');
    fs.readFile(archivo, (err, datos) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(datos);
    });
  })
  .listen(PUERTO, () => console.log(`Paltas Marujita en http://localhost:${PUERTO}`));
