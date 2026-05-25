const { verify } = require("../libs/jwt");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const hasBearer = authHeader.startsWith("Bearer ");

  if (!hasBearer) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  const token = authHeader.slice(7);
  const decoded = verify(token);
  if (!decoded) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  req.user = decoded;
  return next();
};

module.exports = authMiddleware;
