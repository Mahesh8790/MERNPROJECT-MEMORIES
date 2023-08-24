import express from 'express';
import mongoose from 'mongoose';
import PostMessage from '../models/postMessage.js';
import jwt from "jsonwebtoken";

const secret = 'test';
const router = express.Router();
//router is used to handle routes to handle various http requests 
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const isCustomAuth = token.length < 500;

    let decodedData;

    if (token && isCustomAuth) {      
      decodedData = jwt.verify(token, secret);
      req.userId = decodedData?.id;
      /*
      In this code, `req.userId` is being assigned the value of `decodedData?.id`. The `?.` is used 
      for optional chaining, meaning if `decodedData` is not null or undefined, its `id` property will
       be assigned to `req.userId`.
      */
    } else {
      decodedData = jwt.decode(token);
      req.userId = decodedData?.sub;//sub may represent subject or user identity 
    }    
    next();
  } catch (error) {
    console.log(error);
  }
};


const getPosts = async (req, res) => { 
    try {
        const postMessages = await PostMessage.find();  
        res.status(200).json(postMessages);//This code sends a JSON response with the data in the `postMessages` variable and sets the HTTP status code to 200 (OK).
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const getPost = async (req, res) => { 
    const { id } = req.params;
    try {
        const post = await PostMessage.findById(id);
        res.status(200).json(post);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const createPost = async (req, res) => {
    const post = req.body;

    const newPostMessage = new PostMessage({ ...post, creator: req.userId, createdAt: new Date().toISOString() })
    /* here now new PostMessage contains the properties inside the post along with creator created at properties */

    try {
        await newPostMessage.save();

        res.status(201).json(newPostMessage );/*when a new post is successfully created, the server sends an HTTP response with a status code of 201 (Created) along with the newPostMessage object as JSON data. The client receiving this response can then process the data or take further actions as needed*/
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const updatePost = async (req, res) => {
    const { id } = req.params;
    const { title, message, creator, selectedFile, tags } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    const updatedPost = { creator, title, message, tags, selectedFile, _id: id };

    await PostMessage.findByIdAndUpdate(id, updatedPost, { new: true });

    res.json(updatedPost);
}

const deletePost = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    await PostMessage.findByIdAndRemove(id);

    res.json({ message: "Post deleted successfully." });
}

const likePost = async (req, res) => {
    const { id } = req.params;

    if (!req.userId) {
        return res.json({ message: "Unauthenticated" });
      }

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);
     const post = await PostMessage.findById(id);

    const index = post.likes.findIndex((id) => id === String(req.userId));

    if (index === -1) {
      post.likes.push(req.userId);
    } else {
      post.likes = post.likes.filter((id) => id !== String(req.userId));
    }
    const updatedPost = await PostMessage.findByIdAndUpdate(id, post, { new: true });
    res.status(200).json(updatedPost);
}

/*This code defines an `async` function `likePost` that handles the process of liking or unliking a post in a MERN stack project:

1. Extract the `id` from the request parameters.
2. Check if the user is authenticated (`req.userId` exists); if not, respond with an "Unauthenticated" message.
3. Validate if the provided `id` is a valid MongoDB ObjectId. If not valid, respond with a 404 error message indicating the post doesn't exist.
4. Retrieve the post with the given `id` from the database using `PostMessage.findById(id)`.
5. Find the index of the user's ID in the `likes` array of the post.
6. If the index is -1 (user hasn't liked the post), push the user's ID to the `likes` array. Otherwise, remove the user's ID from the `likes` array.
7. Update the post in the database using `PostMessage.findByIdAndUpdate(id, post, { new: true })`.
8. Respond with a 200 status code and the updated post data.

In short, this code handles the process of toggling the like status of a post based on a user's action, updating the post's likes array accordingly, and returning the updated post data.

Note: This code assumes that there's a `PostMessage` model and a MongoDB database connection, as well as the `req.userId` being available after user authentication. 
*/

router.get('/', getPosts);
router.post('/',auth,  createPost);
router.patch('/:id', auth, updatePost);
router.delete('/:id', auth, deletePost);
router.patch('/:id/likePost', auth, likePost);

export default router;