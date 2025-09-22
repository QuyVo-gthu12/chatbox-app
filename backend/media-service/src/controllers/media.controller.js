const { saveFileMeta, getFileMeta } = require('../services/media.service');
const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
  try {
    console.log('Received upload request:', {
      file: req.file,
      body: req.body,
      headers: req.headers,
    });

    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileMeta = await saveFileMeta(req.file);
    console.log('File meta saved:', fileMeta);

    // Trả về URL trực tiếp để frontend hiển thị ảnh
    const fileUrl = `${process.env.MEDIA_URL || 'http://localhost:3002'}/media/${fileMeta.filename}`;

    res.status(201).json({
      message: 'File uploaded successfully',
      fileUrl,           // frontend sẽ dùng field này
      filename: fileMeta.filename,
      type: req.body.type || 'file', // type file hoặc image
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

exports.getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    console.log('Attempting to serve file:', filePath);

    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return res.status(404).json({ message: 'File not found' });
    }

    // Trả file trực tiếp
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ Get file error:', error);
    res.status(404).json({ message: 'File not found', error: error.message });
  }
};
