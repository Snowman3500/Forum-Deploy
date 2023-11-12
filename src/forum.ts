/**
 * Note: Throwing HTTPErrors will be explored in future weeks.
 * The solution currently uses a middleware to convert the error into an object.
 * (see errorHandler.ts)
 */

import HTTPError from 'http-errors';

import fs from 'fs';
export const DATABASE_FILE = 'database.json';

// ========================================================================== //

interface Post {
  postId: number;
  sender: string;
  title: string;
  content: string;
  timeSent: number;
}

interface Comment {
  commentId: number;
  postId: number;
  sender: string;
  comment: string;
  timeSent: number;
}

interface Data {
  posts: Post[];
  comments: Comment[];
}

let dataStore: Data = {
  posts: [],
  comments: [],
};

// ========================================================================== //
/**
 * HELPER FUNCTIONS

 * If there are multiple files that uses these functions, rather than redefining
 * them in each new file, it is better to move these helper functions into a
 * file of its own such as src/helper.ts, then export and import into other files.
 */

// const getData = () => {
//   return dataStore;
// };

// export const setData = (newData: Data) => {
//   dataStore = newData;
//   // Update our persistent data store with any data changes
//   fs.writeFileSync(DATABASE_FILE, JSON.stringify(dataStore));
// };
import request, { HttpVerb } from 'sync-request';

// Replace this with your deployed URL
// E.g. https://z1234444-forum-deploy.vercel.app/
const DEPLOYED_URL = "https://z5480916-forum-deploy.vercel.app/"

const requestHelper = (method: HttpVerb, path: string, payload: object) => {
  let json = {};
  let qs = {};
  if (['POST', 'DELETE'].includes(method)) {
  qs = payload;
  } else {
  json = payload;
  }

  const res = request(method, DEPLOYED_URL + path, { qs, json, timeout: 20000 });
  return JSON.parse(res.body.toString());
};

const getData = (): Data => {
try {
  const res = requestHelper('GET', '/data', {});
  return res.data;
} catch (e) {
  return {
    posts: [],
    comments: [],
  };
}
};

export const setData = (newData: Data) => {
  requestHelper('PUT', '/data', { data: newData });
};

const getTimeStamp = () => Math.floor(Date.now() / 1000);

const checkLength = (label: string, inputString: string, minLength: number, maxLength: number) => {
  if (!inputString || inputString.length < minLength || inputString.length > maxLength) {
    throw HTTPError(400,
      `For our reference solution, we have restricted the length of '${label}'` +
      ` to be between '${minLength}' and '${maxLength}' characters. However, you` +
      ' do not need to do this and should instead follow the specification!'
    );
  }
};

const checkValidPostDetails = (sender: string, title: string, content: string) => {
  checkLength('sender', sender, 1, 20);
  checkLength('title', title, 1, 20);
  checkLength('content', content, 1, 250);
};

// ========================================================================== //

export function postCreate(sender: string, title: string, content: string) {
  checkValidPostDetails(sender, title, content);
  const data = getData();
  const postId = data.posts.length * 2 + 2041;
  data.posts.push({ postId, sender, title, content, timeSent: getTimeStamp() });
  setData(data);
  return { postId };
}

export function postsList() {
  const data = getData();
  const posts = data.posts
    .map(p => ({
      postId: p.postId,
      sender: p.sender,
      title: p.title,
      timeSent: p.timeSent,
    }))
    .sort((p1, p2) => p2.postId - p1.postId);
  return { posts };
}

export function clear() {
  const data = getData();
  data.posts = [];
  data.comments = [];
  setData(data);
  return {};
}
