import request, { HttpVerb, Response } from 'sync-request-curl';
import { port, url } from './config.json';

const SERVER_URL = `${url}:${port}`;

// ========================================================================= //

// Helpers

/**
 * Adds additional hints for students in the returned object
 */
const parseResponse = (res: Response, path: string) => {
  let caughtError = 'Unknown error';
  let comp1531Hint = 'No hint available for this error';
  const body = res.body.toString();
  try {
    // Try returning JSON
    const jsonBody = JSON.parse(body);
    if ('error' in jsonBody && ![400].includes(res.statusCode)) {
      caughtError = `Returned error object with status code ${200}`;
      comp1531Hint = 'For lab05_forum, the only acceptable status code for error cases is 400. ' +
        "Since you returned { error: 'some message' } with a status code other than 400, the test fails";
    } else {
      return jsonBody;
    }
  } catch (e: any) {
    caughtError = e.message;
    if (res.statusCode === 404) {
      caughtError = `Missing route ${path} | ` + caughtError;
      comp1531Hint = `The route '${path}' does not exist on your server (i.e. in server.ts). Check that you do not have any typos and your routes begin with a '/'`;
    } else if (res.statusCode === 500) {
      comp1531Hint = 'Your server has crashed. Check the terminal running the server to see the error stack trace';
    } else {
      comp1531Hint = 'Your routes may not be returning a valid JSON response - for example, the /clear should still return an empty object `{}` instead of undefined.';
    }
  }
  const ret = {
    testName: expect.getState().currentTestName,
    returnedBody: body,
    statusCode: res.statusCode,
    caughtError,
    comp1531Hint
  };
  console.log('Logging Error:', ret);
  return ret;
};

const requestHelper = (method: HttpVerb, path: string, payload: object) => {
  let qs = {};
  let json = {};
  if (['GET', 'DELETE'].includes(method)) {
    qs = payload;
  } else {
    // PUT/POST
    json = payload;
  }
  const res = request(method, SERVER_URL + path, { qs, json, timeout: 20000 });
  return parseResponse(res, path);
};

const generateTimeStamp = () => Math.floor(Date.now() / 1000);

// ========================================================================= //

/**
 * Wrapper functions
 */

function clear() {
  return requestHelper('DELETE', '/clear', {});
}

function root() {
  return requestHelper('GET', '/', {});
}

function echo(message: string) {
  return requestHelper('GET', '/echo/echo', { message });
}

function postCreate(sender: string, title: string, content: string) {
  return requestHelper('POST', '/post/create', { sender, title, content });
}

function postsList() {
  return requestHelper('GET', '/posts/list', {});
}

// ========================================================================= //

beforeEach(clear);
afterAll(clear);

function checkTimestamp(timestamp: number, expectedTimestamp: number) {
  /**
     * Allow for 3 seconds offset
     */
  expect(timestamp).toBeGreaterThanOrEqual(expectedTimestamp - 3);
  expect(timestamp).toBeLessThan(expectedTimestamp + 3);
}

describe('/', () => {
  test('success', () => {
    expect(root()).toStrictEqual({ message: expect.any(String) });
  });
});

describe('/echo', () => {
  test('success', () => {
    expect(echo('helloworld')).toStrictEqual({ message: 'helloworld' });
  });

  test('failure', () => {
    expect(echo('echo')).toStrictEqual({ error: expect.any(String) });
  });
});

describe('/clear', () => {
  test('Return empty', () => {
    expect(clear()).toStrictEqual({});
  });

  test('Clear post', () => {
    postCreate('Nick', 'COMP1531', 'Welcome to COMP1531!');
    expect(postsList().posts.length).toEqual(1);
    expect(clear()).toStrictEqual({});
    expect(postsList()).toStrictEqual({ posts: [] });
  });
});

describe.only('/post/create', () => {
  describe('errors', () => {
    test.each([
      { sender: '', title: 'valid', content: 'valid' },
      { sender: 'valid', title: '', content: 'valid' },
      { sender: 'valid', title: 'valid', content: '' },
    ])("('$sender', '$title', '$content')", ({ sender, title, content }) => {
      const errorPost = postCreate(sender, title, content);
      expect(errorPost).toStrictEqual({ error: expect.any(String) });
    });
  });

  describe('success', () => {
    test('Successful creation', () => {
      const post = postCreate('Emily', 'COMP1531 Post', 'Welcome to COMP1531!');
      expect(post).toStrictEqual({ postId: expect.any(Number) });
    });

    test('Unique IDs, same entries', () => {
      const post1 = postCreate('Emily', 'COMP1531 Post', 'Welcome to COMP1531!');
      const post2 = postCreate('Emily', 'COMP1531 Post', 'Welcome to COMP1531!');
      const post3 = postCreate('Emily', 'COMP1531 Post', 'Welcome to COMP1531!');
      const uniqueIds = Array.from(new Set([post1.postId, post2.postId, post3.postId]));
      expect(uniqueIds).toHaveLength(3);
    });
  });
});

describe('/posts/list', () => {
  test('empty state', () => {
    expect(postsList()).toStrictEqual({ posts: [] });
  });

  test('one post', () => {
    const title = 'title';
    const sender = 'sender';

    const timeSent = generateTimeStamp();
    const { postId } = postCreate(sender, title, 'content');
    const { posts } = postsList();

    expect(posts).toStrictEqual([{ postId, title, sender, timeSent: expect.any(Number) }]);

    // Checking timeSent separately
    checkTimestamp(posts[0].timeSent, timeSent);
  });

  test('multiple posts', () => {
    // Should use proper type instead of 'any'
    const expectedPosts: any[] = [];

    const baseTime = generateTimeStamp();
    for (let i = 0; i < 10; i++) {
      const sender = `sender ${i}`;
      const title = `title ${i}`;
      const content = `content ${i}`;
      const { postId } = postCreate(sender, title, content);
      expectedPosts.unshift({
        postId,
        sender,
        title,
      });
    }

    const posts = postsList().posts;
    expect(posts.length).toEqual(expectedPosts.length);

    // Should use proper type instead of 'any'
    const postsWithoutTimeStamp: any[] = [];
    for (const post of posts) {
      const { timeSent, ...otherDetails } = post;
      // expect(expectedPosts).toContainEqual(otherDetails);
      checkTimestamp(post.timeSent, baseTime);
      postsWithoutTimeStamp.push(otherDetails);
    }
    expect(postsWithoutTimeStamp).toStrictEqual(expectedPosts);
  });
});
