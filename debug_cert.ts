
import * as tls from 'tls';

async function checkCert(hostname: string, port: number = 443) {
    console.log(`Checking ${hostname}:${port}...`);

    return new Promise((resolve, reject) => {
        const options = {
            host: hostname,
            port: port,
            servername: hostname,
            rejectUnauthorized: false,
        };

        const socket = tls.connect(options, () => {
            const cert = socket.getPeerCertificate();

            if (!cert || Object.keys(cert).length === 0) {
                console.log('No certificate found');
                socket.destroy();
                return resolve(null);
            }

            console.log('Raw valid_to:', cert.valid_to);
            const validTo = new Date(cert.valid_to);
            console.log('Parsed validTo:', validTo.toString());

            const now = new Date();
            console.log('Now:', now.toString());

            const diffMs = validTo.getTime() - now.getTime();
            console.log('Diff (ms):', diffMs);

            const daysUntilExpiry = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            console.log('Days until expiry:', daysUntilExpiry);

            const alarmThreshold = 3000; // Intentionally high to trigger alarm
            console.log(`Testing alarm threshold: ${alarmThreshold}`);

            if (daysUntilExpiry <= alarmThreshold) {
                console.log('ALARM TRIGGERED (Correct)');
            } else {
                console.log('ALARM NOT TRIGGERED (Incorrect if days < threshold)');
            }

            socket.destroy();
            resolve(daysUntilExpiry);
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
            reject(err);
        });
    });
}

checkCert('google.com');
