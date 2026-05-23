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

    // Reject tokens issued before the UUID migration (id would be a number)
    if (typeof decodedToken.id !== "string") {
      return response
        .status(401)
        .json({ message: "Session expired. Please log in again." });
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
        isActive: true,
      },
    });

    if (!user) {
      return response.status(401).json({ message: "User no longer exists." });
    }

    if (!user.isActive) {
      return response
        .status(403)
        .json({ message: "Your account has been disabled." });
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
