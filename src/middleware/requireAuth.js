import { prisma } from "../lib/prisma.js";
import { verifyAuthToken } from "../lib/auth.js";

export async function requireAuth(request, response, next) {
  try {
    const authHeader = request.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return response.status(401).json({ message: "Authentication required." });
    }

    const decodedToken = verifyAuthToken(token);

    if (!decodedToken) {
      return response
        .status(401)
        .json({ message: "Invalid or expired token." });
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        prefix: true,
        email: true,
        role: true,
        hospitalId: true,
        isVerified: true,
      },
    });

    if (!user) {
      return response.status(401).json({ message: "User no longer exists." });
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
