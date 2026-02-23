const fs = require('fs');
const path = require('path');
const io = require('socket.io-client'); // In v4, io is the default export in cjs

async function run() {
    try {
        const testFilePath = path.join(__dirname, 'test.xlsx');
        fs.writeFileSync(testFilePath, Buffer.alloc(25 * 1024 * 1024, 'A'));

        const email = 'testuser123@example.com';
        const password = 'password123';
        let token;

        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            token = data.token;
        } catch (err) {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            token = data.token;
        }

        console.log('Connecting socket...');
        const socket = io('http://localhost:5000', {
            auth: { token }
        });

        socket.on('connect', () => {
            console.log('Test socket connected:', socket.id);
        });

        let finished = false;

        socket.on('uploadStatus', (data) => {
            console.log('=== Received uploadStatus ===', data);
            finished = true;
            socket.disconnect();
            fs.unlinkSync(testFilePath);
            process.exit(0);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            if (!finished) process.exit(1);
        });

        // wait for connection before sending file
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { Blob } = require('buffer');
        const fileContent = fs.readFileSync(testFilePath);
        const fileBlob = new Blob([fileContent], { type: 'application/octet-stream' });

        const form = new FormData();
        form.append('file', fileBlob, 'test.xlsx');

        console.log('Uploading file...');
        const uploadRes = await fetch('http://localhost:5000/api/uploads', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form
        });

        const uploadData = await uploadRes.json();
        console.log('Upload response:', uploadData);

        // Wait up to 10 seconds for socket event
        setTimeout(() => {
            if (!finished) {
                console.error('Timed out waiting for socket event');
                process.exit(1);
            }
        }, 10000);

    } catch (error) {
        console.error('Error occurred:', error.message);
    }
}
run();
