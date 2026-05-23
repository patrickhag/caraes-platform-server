import { createAdminUser } from "./src/lib/auth.js";

const admin = await createAdminUser();
console.log(admin);
