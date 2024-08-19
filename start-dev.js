import { spawn } from 'child_process';

function runCommand(command) {
    return new Promise((resolve, reject) => {
        const [cmd, ...args] = command.split(/\s+/); // Split the command string into command and arguments
        const process = spawn(cmd, args, { stdio: 'inherit' }); // Use 'inherit' to display output in the parent's stdio

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command "${command}" failed with exit code ${code}`));
            }
        });
    });
}

async function startDev() {
    try {
        // Build the project
        console.log('Building the project...');
        await runCommand('yarn run build');
        // Start the Nest application
        console.log('Starting the application...');
        await runCommand('yarn run start:prod');
    } catch (error) {
        console.error('Failed to start the application:', error);
    }
}

startDev();
