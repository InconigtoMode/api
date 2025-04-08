const express = require('express');
const tls = require('tls');

const app = express().set("json spaces", 2)
const PORT = process.env.PORT || 15787;

const getFlag = (code) => {
    const flagOffset = 127397;
    return code
        ? [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt() + flagOffset)).join('')
        : '❓';
};

app.get('/:ipPort', async (req, res) => {
    const [proxy, port = 443] = req.params.ipPort.split(':');
    if (!proxy || !port) {
        return res.json({ proxyip: "false" });
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

    const startTime = Date.now(); // Menyimpan waktu saat request dimulai

    try {
        const [ipinfo, myips] = await Promise.all([
            sendRequest('myip.bexcode.us.to', '/', true),
            sendRequest('myip.bexcode.us.to', '/', false),
        ]);
        const ipingfo = JSON.parse(ipinfo);
        const { myip, countryCode, ...ipinfoh } = ipingfo;
        const srvip = JSON.parse(myips);

        const latency = Date.now() - startTime; // Menghitung latency

        if (myip && myip !== srvip.myip) {
            res.json({
                proxy: proxy,
                port: port,
                proxyip: myip !== srvip.myip,
                ip: myip,
                countryCode: countryCode,
                flag: getFlag(countryCode), 
                ...ipinfoh,
                latency: `${latency}ms`, // Pindahkan ke bawah
            });
        } else {
            res.json({ proxy: proxy, port: port, proxyip: false, latency: `${latency}ms` });
        }
    } catch (error) {
        const latency = Date.now() - startTime; // Menghitung latency jika terjadi error
        res.json({ proxy: proxy, port: port, proxyip: false, latency: `${latency}ms` });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
