const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

const findAvailablePort = (startPort) => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
};

const startService = (name, command, args, env, color) => {
    const proc = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, ...env }
    });

    const prefix = `${color}[${name}]${colors.reset} `;

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.log(prefix + line);
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.error(prefix + colors.red + line + colors.reset);
        });
    });

    proc.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.log(`${prefix}Process exited with code ${code}`);
        }
    });

    return proc;
};

const run = async () => {
    try {
        console.log(`${colors.cyan}🚀 Finding available ports...${colors.reset}`);

        // 1. Find Backend Port
        const backendPort = await findAvailablePort(3000);
        console.log(`${colors.green}✔ Backend Port available: ${backendPort}${colors.reset}`);

        // 2. Find Frontend Port
        const frontendPort = await findAvailablePort(5173);
        console.log(`${colors.green}✔ Frontend Port available: ${frontendPort}${colors.reset}`);

        // 3. Start Backend
        console.log(`${colors.blue}Starting Backend Service...${colors.reset}`);
        const backend = startService('Backend', 'npm', ['run', 'dev:backend'], {
            PORT: backendPort,
            FORCE_COLOR: '1'
        }, colors.blue);

        // 4. Start Frontend
        // Vite needs PORT env var to override configuration
        // And VITE_API_TARGET to configure proxy
        console.log(`${colors.yellow}Starting Frontend Service...${colors.reset}`);
        const frontend = startService('Frontend', 'npm', ['run', 'dev:frontend'], {
            PORT: frontendPort,
            VITE_API_TARGET: `http://localhost:${backendPort}`,
            FORCE_COLOR: '1'
        }, colors.yellow);

        console.log(`\n${colors.cyan}✨ App launching on http://localhost:${frontendPort}${colors.reset}\n`);
        console.log(`${colors.cyan}📡 API target: http://localhost:${backendPort}${colors.reset}\n`);

        // Handle termination
        const cleanup = () => {
            backend.kill();
            frontend.kill();
            process.exit();
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

    } catch (error) {
        console.error(`${colors.red}Error starting development environment:${colors.reset}`, error);
        process.exit(1);
    }
};

run();
