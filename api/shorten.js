const axios = require('axios');

class ShortUrl {
    // 1. IS.GD (Menggunakan API Resmi JSON)
    isgd = async function (url) {
        try {
            // Validasi URL
            if (!url.match(/^https?:\/\//)) {
                url = 'https://' + url;
            }

            const response = await axios.get('https://is.gd/create.php', {
                params: {
                    format: 'json',
                    url: url
                },
                timeout: 5000 // Timeout 5 detik agar tidak hang
            });

            if (response.data.errorcode) {
                throw new Error(response.data.errormessage || 'Is.gd menolak URL ini.');
            }

            return response.data.shorturl;
        } catch (error) {
            console.error('ISGD Error:', error.message);
            throw new Error('Gagal memproses is.gd. Pastikan URL valid.');
        }
    }
    
    // 2. TINYURL (Pengganti Tinu.be agar 100% Sukses)
    tinyurl = async function (url, alias = '') {
        try {
             if (!url.match(/^https?:\/\//)) {
                url = 'https://' + url;
            }

            // TinyURL API Endpoint
            let apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
            if (alias) {
                apiUrl += `&alias=${encodeURIComponent(alias)}`;
            }

            const response = await axios.get(apiUrl, {
                timeout: 5000
            });

            if (response.data === 'Error') {
                 throw new Error('Alias sudah digunakan atau URL tidak valid.');
            }

            return response.data;
        } catch (error) {
            console.error('TinyURL Error:', error.message);
            // Handle error spesifik dari TinyURL jika alias duplikat
            if(error.response && error.response.status === 422) {
                throw new Error('Custom Alias sudah terpakai. Coba kata lain.');
            }
            throw new Error('Gagal memproses TinyURL.');
        }
    }
}

// Handler Vercel
module.exports = async (req, res) => {
    // Header CORS agar frontend bisa akses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: false, error: 'Method Not Allowed' });
    }

    const { url, provider, alias } = req.body;

    if (!url) {
        return res.status(400).json({ status: false, error: 'URL tidak boleh kosong.' });
    }

    const shortener = new ShortUrl();

    try {
        let resultUrl;
        
        if (provider === 'isgd') {
            resultUrl = await shortener.isgd(url);
        } else if (provider === 'tinyurl') {
            resultUrl = await shortener.tinyurl(url, alias);
        } else {
            return res.status(400).json({ status: false, error: 'Provider tidak valid.' });
        }

        return res.status(200).json({ status: true, result: resultUrl });

    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
};
