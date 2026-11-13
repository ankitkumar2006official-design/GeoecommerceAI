const fs = require('fs');

/**
 * Validates actual file format using magic bytes / binary signatures
 * to prevent MIME spoofing attacks (e.g., executable renamed to .csv or .xlsx).
 */
function validateFileSignature(filePath, ext) {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found for signature verification.');
  }

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(1024);
  const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
  fs.closeSync(fd);

  if (bytesRead === 0) {
    throw new Error('Uploaded file is empty (0 bytes).');
  }

  const normalizedExt = (ext || '').toLowerCase();

  // Executable binary signatures to reject unconditionally
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) { // 'MZ' DOS/PE Executable
    throw new Error('Security Rejection: Executable binary detected.');
  }
  if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) { // ELF Binary
    throw new Error('Security Rejection: Linux executable binary detected.');
  }

  if (normalizedExt === '.xlsx') {
    // OOXML Zip header: PK\x03\x04
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new Error('Invalid Excel (.xlsx) file signature: File is not a valid zip-compressed spreadsheet.');
    }
  } else if (normalizedExt === '.xls') {
    // OLE2 / Compound Document header: \xD0\xCF\x11\xE0
    if (buffer[0] !== 0xD0 || buffer[1] !== 0xCF || buffer[2] !== 0x11 || buffer[3] !== 0xE0) {
      throw new Error('Invalid Excel (.xls) file signature: File is not a valid compound binary spreadsheet.');
    }
  } else if (normalizedExt === '.csv') {
    // Plain text / CSV: Should not contain null bytes \x00 in initial chunk
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0x00) {
        throw new Error('Invalid CSV file: Binary null bytes detected in text content.');
      }
    }
  }

  return true;
}

module.exports = { validateFileSignature };

