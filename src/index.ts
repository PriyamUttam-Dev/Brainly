import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import cors from "cors";
import { ContentModel, LinkModel, User } from "./db";
import { JWT_SECRET } from "./config";
import { userMiddleware } from "./middleware";
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";


// /fix Property 'userId' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.

// You need to extend the Express Request interface to include the userId property, so TypeScript recognizes it as valid.
// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();
app.use(express.json());
app.use(cors());

//zod schema for user signup
const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

app.post("/api/v1/signup", async (req, res) => {
  const result = signUpSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.format() });
  }
  const { username, password } = result.data;
  //hash the password 
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await User.create({
      username: username,
      password: hashedPassword,
    });
    return res.json({ message: "success user created" }).status(201);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "errorResponse" in error &&
      typeof (error as any).errorResponse === "object" &&
      (error as any).errorResponse !== null &&
      "code" in (error as any).errorResponse &&
      (error as any).errorResponse.code === 11000
    ) {
      console.log("Error creating user: User already exists");
      return res.status(409).json({ message: "User already exists" });
    } else {
      console.log("Error creating user:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

app.post("/api/v1/signin", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const existingUser = await User.findOne({ username, password });
  if (existingUser) {
    const token = jwt.sign({ username: existingUser?._id }, JWT_SECRET);
    res
      .json({ token: token, message: "success user logged in successfully" })
      .status(201);
  } else {
    console.log("User not found");
    res.json({ message: "User not found" }).status(403);
  }
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
  const { title, link, tags } = req.body;
  // Extracted from the middleware
  await ContentModel.create({
    title,
    link,
    //@ts-ignore
    userId: req.userId, // Using the userId from the middleware
    tags: [],
  });
  res.json({ message: "Content created successfully" }).status(201);
});

app.get("/api/v1/content", userMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = req.userId; // Extracted from the middleware
  const content = await ContentModel.find({ userId: userId }).populate(
    "userId",
    "username"
  );
  res.json(content).status(200);
});

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
  const contendId = req.body.contentId;
  await ContentModel.findByIdAndDelete(contendId);
  res.json({ message: "Content deleted successfully" }).status(200);
});

// Route 6: Share Content Link
app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
    const { share } = req.body;
    if (share) {
        // Check if a link already exists for the user.
        const existingLink = await LinkModel.findOne({ userId: req.userId });
        if (existingLink) {
            res.json({ hash: existingLink.hash }); // Send existing hash if found.
            return;
        }

        // Generate a new hash for the shareable link.
        const hash = 10;
        await LinkModel.create({ userId: req.userId, hash });
        res.json({ hash }); // Send new hash in the response.
    } else {
        // Remove the shareable link if share is false.
        await LinkModel.deleteOne({ userId: req.userId });
        res.json({ message: "Removed link" }); // Send success response.
    }
});

// Route 7: Get Shared Content
app.get("/api/v1/brain/:shareLink", async (req, res) => {
    const hash = req.params.shareLink;

    // Find the link using the provided hash.
    const link = await LinkModel.findOne({ hash });
    if (!link) {
        res.status(404).json({ message: "Invalid share link" }); // Send error if not found.
        return;
    }

    // Fetch content and user details for the shareable link.
    const content = await ContentModel.find({ userId: link.userId });
    const user = await User.findOne({ _id: link.userId });

    if (!user) {
        res.status(404).json({ message: "User not found" }); // Handle missing user case.
        return;
    }

    res.json({
        username: user.username,
        content
    }); // Send user and content details in response.
});


app.listen(3000, () => {
  console.log("server is running on port 3000");
});
