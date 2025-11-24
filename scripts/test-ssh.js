
/*
import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Connected!');
  conn.end();
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '87.106.32.81',
  port: 22,
  username: 'monitor',
  password: 'M!!oNiTor+2025',
  readyTimeout: 20000, // wait longer for handshake
  algorithms: {
    kex: [
      'diffie-hellman-group14-sha1',
      'diffie-hellman-group-exchange-sha1',
      'diffie-hellman-group-exchange-sha256'
    ],
    serverHostKey: [
      'ssh-rsa',
      'ssh-dss'
    ],
    cipher: [
      'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
      'aes128-gcm', 'aes256-gcm'
    ]
  }
});
*/

const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Connected!');
  conn.exec('uptime', (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => {
      console.log('Output:', data.toString());
    });
    stream.on('close', () => {
      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

conn.connect({
  host: '87.106.32.81',
  port: 22,
  username: 'monitoring_user',
  password: 'R9!fT2#xPz@8vWqL$s1'
});
 