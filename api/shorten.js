const axios = require('axios');
const cheerio = require('cheerio');

// Class dari kode Anda
class ShortUrl {
    isgd = async function (url) {
        try {
            // Validasi dasar
            if (!url.startsWith('http')) throw new Error('URL harus menyertakan https:// atau http://');
            
            const { data } = await axios.post('https://cors.caliph.my.id/https://is.gd/create.php', new URLSearchParams({
                url: url,
                shorturl: '',
                opt: 0
            }).toString(), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    origin: 'https://is.gd',
                    referer: 'https://is.gd/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
                }
            });
            
            const $ = cheerio.load(data);
            const result = $('input#short_url').attr('value');
            if (!result) throw new Error('Gagal membuat link is.gd (Mungkin limit atau error server).');
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    tinube = async function (url, suffix = '') {
        try {
            if (!url.startsWith('http')) throw new Error('URL harus menyertakan https:// atau http://');
            
            // Generate random suffix jika kosong agar tidak error duplikat
            const finalSuffix = suffix || Math.random().toString(36).substring(2, 8);

            const { data } = await axios.post('https://tinu.be/en', [{
                longUrl: url,
                urlCode: finalSuffix
            }], {
                headers: {
                    'next-action': '74b2f223fe2b6e65737e07eeabae72c67abf76b2',
                    'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22(site)%22%2C%7B%22children%22%3A%5B%5B%22lang%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
                    origin: 'https://tinu.be',
                    referer: 'https://tinu.be/en',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
                }
            });
            
            // Parsing Logic yang ketat sesuai payload Next.js
            const line = data.split('\n').find(line => line.startsWith('1:'));
            if(!line) throw new Error('Respons dari Tinu.be tidak valid.');

            const result = JSON.parse(line.substring(2)).data.urlCode;
            if (!result) throw new Error('Custom Alias sudah digunakan atau tidak tersedia.');
            
            return 'https://tinu.be/' + result;
        } catch (error) {
            console.error(error); // Log error untuk debugging di Vercel
            throw new Error('Gagal memproses Tinu.be: ' + error.message);
        }
    }
}

// Handler utama Vercel
module.exports = async (req, res) => {
    // Izinkan CORS agar bisa diakses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url, provider, alias } = req.body;
    const shortener = new ShortUrl();

    try {
        let resultUrl;
        
        if (provider === 'isgd') {
            resultUrl = await shortener.isgd(url);
        } else if (provider === 'tinube') {
            resultUrl = await shortener.tinube(url, alias);
        } else {
            return res.status(400).json({ error: 'Provider tidak valid' });
        }

        return res.status(200).json({ status: true, result: resultUrl });

    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
