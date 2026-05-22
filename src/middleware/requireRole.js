export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user) {
      return response.status(401).json({ message: "Authentication required." });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ message: "Insufficient permissions." });
    }

    next();
  };
}
