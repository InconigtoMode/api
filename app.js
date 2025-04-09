const express = require('express');
const tls = require('tls');

const app = express().set("json spaces", 2)
const PORT = process.env.PORT || 15787;

app.get('/:ipPort', async (req, res) => {
    const [proxy, port = 443] = req.params.ipPort.split(':');
    if (!proxy || !port) {
        return res.json({ error: "mana proxynya?" });
    }
    const sendRequest = (host, path, useProxy = true) => {
        return new Promise((resolve, reject) => {
            const socket = tls.connect({
                host: useProxy ? proxy : host,
                port: useProxy ? port : 443,
                servername: host
            }, () => {
                const request = `GET ${path} HTTP/1.1\r\n` +
                    `Host: ${host}\r\n` +
                    `User-Agent: Mozilla/5.0\r\n` +
                    `Connection: close\r\n\r\n`;
                socket.write(request);
            });

            let responseBody = '';

            socket.on('data', (data) => {
                responseBody += data.toString();
            });

            socket.on('end', () => {
                const body = responseBody.split('\r\n\r\n')[1] || '';
                resolve(body);
            });

            socket.on('error', (error) => {
                reject(error);
            });

            socket.setTimeout(5000, () => {
                reject(new Error('Request timeout'));
                socket.end();
            });
        });
    };

    try {
        const [ipinfo, myips] = await Promise.all([
            sendRequest('myip.bexcode.us.to', '/', true),
            sendRequest('myip.bexcode.us.to', '/', false),
        ]);
        const ipingfo = JSON.parse(ipinfo);
        const {myip, ...ipinfoh} = ipingfo
        const srvip = JSON.parse(myips);

        if (myip && myip !== srvip.myip) {
            res.json({
                proxy: proxy,
                port: port,
                proxyip: myip !== srvip.myip,
                ip: myip,
                ...ipinfoh,
            });
        } else {
            res.json({ proxyip: false });
        }
    } catch (error) {
        res.json({ error: error.message, proxyip: false });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
