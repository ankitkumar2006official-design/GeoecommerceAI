const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'geocommerce_super_secret_jwt_key_2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid format.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.sellerId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired. Please sign in again.' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };

