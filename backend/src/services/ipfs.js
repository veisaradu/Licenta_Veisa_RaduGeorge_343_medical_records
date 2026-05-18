const axios = require('axios');
const FormData = require('form-data');

async function uploadToIPFS(data) {
  const formData = new FormData();
  const buffer = Buffer.from(JSON.stringify(data));
  formData.append('file', buffer, { filename: 'encrypted_document.json' });

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
      maxContentLength: Infinity,
    }
  );

  return response.data.IpfsHash;
}

async function getFromIPFS(cid) {
  const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
  return response.data;
}

module.exports = { uploadToIPFS, getFromIPFS };