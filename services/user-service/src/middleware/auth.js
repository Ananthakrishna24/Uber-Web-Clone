import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const authenticate = (req, res, next) => {
  // --- Option 1: Gateway forwarded user info via headers (trusted) ---
  const gatewayUserId = req.headers['x-user-id'];
  if (gatewayUserId) {
    req.user = {
      id: gatewayUserId,
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'],
    };
    return next();
  }

  // --- Option 2: Direct JWT verification (fallback for dev/testing) ---
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authenticate;
