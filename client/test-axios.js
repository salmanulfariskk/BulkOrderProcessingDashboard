const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
    const formData = new FormData();
    formData.append('file', Buffer.from('dummy data'), 'test.xlsx');

    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    try {
        console.log('Sending with undefined Content-Type header...');

        // This simulates interceptor behavior where we might delete Content-Type
        api.interceptors.request.use(config => {
            console.log('Final headers:', config.headers);
            return config;
        });

        // method 1: Content-Type: multipart/form-data explicitly
        const conf1 = await api.post('/test', formData, {
            headers: {
                ...formData.getHeaders(),
                // 'Content-Type': 'multipart/form-data'
            }
        }).catch(e => e); // catch because /test doesn't exist
    } catch (e) {
        console.error(e);
    }
}
run();
