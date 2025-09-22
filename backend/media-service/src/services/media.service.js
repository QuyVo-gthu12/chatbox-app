const saveFileMeta = async (file) => {
  try {
    if (!file || !file.originalname || !file.filename) {
      console.error('Invalid file object:', file);
      throw new Error('Invalid file object provided');
    }

    console.log('Saving file metadata:', {
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    });

    const fileMeta = {
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date()
    };

    // TODO: Thêm logic lưu vào Cassandra nếu cần
    // Ví dụ: await cassandraClient.execute('INSERT INTO files (...) VALUES (...)', fileMeta);

    return fileMeta;
  } catch (error) {
    console.error('❌ Error in saveFileMeta:', error);
    throw error;
  }
};

const getFileMeta = async (filename) => {
  try {
    if (!filename) {
      console.error('No filename provided');
      throw new Error('Filename is required');
    }

    console.log('Retrieving file metadata for:', filename);

    // TODO: Thêm logic query từ Cassandra nếu cần
    // Ví dụ: const result = await cassandraClient.execute('SELECT * FROM files WHERE filename = ?', [filename]);

    return { filename };
  } catch (error) {
    console.error('❌ Error in getFileMeta:', error);
    throw error;
  }
};

module.exports = { saveFileMeta, getFileMeta };