import type { NextApiRequest, NextApiResponse } from "next";

type RegisterBody = {
  name?: string;
  email: string;
  password: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, password } = req.body as RegisterBody;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Simulated database logic
    // (in a real app: hash password, save user, etc.)
    return res.status(201).json({
      token: "dummy-jwt-token",
      user: {
        id: "1",
        name: name ?? "Anonymous",
        email,
        role: "user",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
