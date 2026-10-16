// 로컬 테스트용 서버: node dev.mjs  →  http://localhost:3000  (저장소는 메모리)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  res.send = (b) => res.end(b);
  if (u.pathname.startsWith('/api/')) {
    req.query = Object.fromEntries(u.searchParams);
    let body = ''; for await (const c of req) body += c;
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
    const mod = await import('./api/' + u.pathname.slice(5).replace(/[^a-z]/g, '') + '.js');
    return mod.default(req, res);
  }
  let p = path.join(root, u.pathname);
  if (!p.startsWith(root)) return res.status(403).end();
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  else if (!fs.existsSync(p) && fs.existsSync(p + '.html')) p += '.html';
  if (!fs.existsSync(p)) return res.status(404).end('not found');
  res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
