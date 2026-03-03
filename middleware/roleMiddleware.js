function requireRoles(...allowedRoles) {
  return function roleCheck(req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}

module.exports = requireRoles;
