const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'memory.json');

// --- DATABASE UTILITIES ---
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], logs: [] }, null, 2));
}

const getDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- HELPER: SERVING STATIC FILES (Public Folder) ---
const serveFile = (res, filePath, contentType) => {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end("FILE_NOT_FOUND");
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
};

// --- THE TRADITIONAL SERVER ---
const server = http.createServer((req, res) => {
    const url = req.url;
    const method = req.method;

    // 1. STATIC FILE ROUTING
    if (method === 'GET' && !url.startsWith('/api')) {
        let filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (ext) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
        }
        serveFile(res, filePath, contentType);
        return;
    }

    // 2. API ROUTING (Manual Body Parsing for Node 13.14)
    if (method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            const db = getDB();

            // --- ROUTE: LOGIN ---
            if (url === '/api/login') {
                const user = db.users.find(u => u.username === data.username && u.password === data.password);
                if (user) {
                    const accessEntry = {
                        event: "PROTOCOL_ESTABLISHED",
                        user: user.bio_signature,
                        id: data.username,
                        timestamp: new Date().toISOString(),
                        status: "STABLE"
                    };
                    db.logs.push(accessEntry);
                    saveDB(db);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, operator: user.bio_signature }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: "NEURAL_KEY_MISMATCH" }));
                }
            }

            // --- ROUTE: REGISTER ---
            else if (url === '/api/register') {
                if (db.users.find(u => u.username === data.username)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: "ID_ALREADY_IN_MEMORY" }));
                } else {
                    db.users.push({ 
                        bio_signature: data.bio_signature, 
                        username: data.username, 
                        password: data.password 
                    });
                    saveDB(db);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                }
            }
        });
    }

    // --- ROUTE: TELEMETRY (GET /api/data) ---
    else if (method === 'GET' && url === '/api/data') {
        const db = getDB();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            history: db.logs.slice(-20),
            vitals: { uplink_status: "ACTIVE", node_count: db.users.length }
        }));
    }
});

server.listen(PORT, () => {
    console.log("\x1b[36m%s\x1b[0m", "ALPHARISE TRADITIONAL SERVER ONLINE [Node 13.14]");
    console.log(`Uplink: http://localhost:${PORT}`);
});