import mongoose, { model, Schema, Types } from "mongoose";

mongoose
  .connect("mongodb://localhost:27017/brainlydb")
  .then(() => {
    console.log("db connected");
  })
  .catch((err: Error) => {
    console.log(err);
  });

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: String,
});

export const User = model("User", userSchema);

//Content Schema
const ContentSchema = new Schema({
  Title: String,
  Link: String,
  tags: [{ type: Types.ObjectId, ref: "Tag" }], // Array of tag IDs, referencing the 'tag' collection
  userId: [
    {
      type: Types.ObjectId,
      ref: "User",
      required: true, // The 'userId' field is mandatory to link content to a user
    },
  ],
});

export const ContentModel = model("Content", ContentSchema);

//Link Schema

const LinkSchema = new Schema({
  // 'hash' is a string that represents the shortened or hashed version of a link
  hash: String,
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
});

export const LinkModel = model("Links" ,LinkSchema);
