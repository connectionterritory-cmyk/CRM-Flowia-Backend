const net = require('net');
const http = require('http');

// Colors for output
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

console.log(`${colors.cyan}🩺 CRM Servicio MVP - System Doctor${colors.reset}\n`);

// Check if a port is in use
const checkPort = (port, name) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            resolve({ status: true, message: `${colors.green}✅ ${name} port ${port} is active${colors.reset}` });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ status: false, message: `${colors.red}❌ ${name} port ${port} is NOT active (Timeout)${colors.reset}` });
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve({ status: false, message: `${colors.red}❌ ${name} port ${port} is NOT active (Connection Refused)${colors.reset}` });
        }); // Typically ECONNREFUSED

        socket.connect(port, 'localhost');
    });
};

// Check API functionality
const checkAPI = () => {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3000/api/dashboard/stats', (res) => {
            // Consume data to free memory
            res.resume();

            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ status: true, message: `${colors.green}✅ API Health Check passed (Status ${res.statusCode})${colors.reset}` });
            } else {
                resolve({ status: false, message: `${colors.red}❌ API Health Check failed (Status ${res.statusCode})${colors.reset}` });
            }
        });

        req.on('error', (err) => {
            resolve({ status: false, message: `${colors.red}❌ API Health Check failed (${err.message})${colors.reset}` });
        });

        req.end();
    });
};

const run = async () => {
    try {
        const portResults = await Promise.all([
            checkPort(3000, 'Backend'),
            checkPort(5173, 'Frontend')
        ]);

        // Only check API if Backend port is open
        let apiResult = { status: false, message: `${colors.yellow}⚠️ Skipping API check because backend is down${colors.reset}` };
        if (portResults[0].status) {
            apiResult = await checkAPI();
        }

        const results = [...portResults, apiResult];

        // Print results
        results.forEach(r => console.log(r.message));

        const allPassed = results.every(r => r.status);
        console.log('\n----------------------------------------');

        if (allPassed) {
            console.log(`${colors.green}PASS: All systems operational${colors.reset}`);
            process.exit(0);
        } else {
            console.log(`${colors.red}FAIL: One or more checks failed${colors.reset}`);
            console.log(`${colors.yellow}Tip: Run 'npm run dev' to start the system.${colors.reset}`);
            process.exit(1);
        }
    } catch (e) {
        console.error('Doctor script error:', e);
        process.exit(1);
    }
};

run();
