const express = require('express');
const expressHandlebars = require('express-handlebars');
const passport = require('passport');
const session = require('express-session');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const { createCanvas } = require('canvas');
const crypto = require('crypto'); // Add this line to import the crypto module
const dotenv = require('dotenv');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const app = express();
const PORT = 3000;

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, (token, tokenSecret, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

const dbFileName = 'microblog.db';
let db;

async function initializeDB() {
    db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });
    console.log('Database connected.');
}

app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
            includes: function (array, value, options) {
                if (array && array.includes(value)) {
                    return options.fn ? options.fn(this) : true;
                }
                return options.inverse ? options.inverse(this) : false;
            },
            formatTimestamp: timestamp => {
                const date = new Date(timestamp);
                const options = {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                };
                return date.toLocaleString('en-US', options);
            }
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(
    session({
        secret: 'oneringtorulethemall',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

app.use((req, res, next) => {
    res.locals.appName = 'MicroBlog';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.user = getCurrentUser(req) || {};
    next();
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    async (req, res) => {
        const googleId = req.user.id;
        const hashedGoogleId = crypto.createHash('sha256').update(googleId).digest('hex');
        req.session.hashedGoogleId = hashedGoogleId;

        try {
            let localUser = await findUserByHashedGoogleId(hashedGoogleId);
            if (localUser) {
                req.session.userId = localUser.id;
                req.session.loggedIn = true;
                res.redirect('/');
            } else {
                res.redirect('/registerUsername');

            }
        }
        catch (err) {
            console.error('Error finding user:', err);
            res.redirect('/error');
        }
});

app.get('/registerUsername', (req, res) => {
    res.render('registerUsername', { regError: req.query.error });
});

app.get('/', async (req, res) => {
    const posts = await getPosts();
    const user = await getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

app.get('/error', (req, res) => {
    res.render('error');
});

app.get('/post/:id', async (req, res) => {
    const post = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (post) {
        res.render('post', { post });
    } else {
        res.redirect('/error');
    }
});

app.post('/posts', async (req, res) => {
    const { title, content } = req.body;
    const user = await getCurrentUser(req);
    if (user) {
        await addPost(title, content, user);
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.post('/like/:id', async (req, res) => {
    await updatePostLikes(req, res);
});

app.get('/profile', isAuthenticated, async (req, res) => {
    await renderProfile(req, res);
});

app.get('/avatar/:username', (req, res) => {
    handleAvatar(req, res);
});

app.post('/register', async (req, res) => {
    await registerUser(req, res);
});

app.post('/registerUsername', async (req, res) => {
    await registerUser(req, res);
});

app.post('/login', async (req, res) => {
    await loginUser(req, res);
});

app.get('/logout', (req, res) => {
    logoutUser(req, res);
});

app.get('/googleLogout', (req, res) => {
    res.render('googleLogout');
});

app.post('/delete/:id', isAuthenticated, async (req, res) => {
    const postId = parseInt(req.params.id);
    const user = await getCurrentUser(req);
    const post = await db.get('SELECT * FROM posts WHERE id = ? AND username = ?', [postId, user.username]);
    if (post) {
        await db.run('DELETE FROM posts WHERE id = ?', [postId]);
        res.redirect('/');
    } else {
        res.redirect('/error');
    }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, async () => {
    await initializeDB();
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

async function getCurrentUser(req) {
    if (!req.session.userId) return null;
    return await db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
}

async function getPosts() {
    return await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
}

async function addPost(title, content, user) {
    await db.run(
        'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
        [title, content, user.username, new Date().toISOString(), 0]
    );
}

async function updatePostLikes(req, res) {
    const postId = parseInt(req.params.id);
    const user = await getCurrentUser(req);
    const post = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (post && user && post.username !== user.username) {
        const likedBy = JSON.parse(post.likedBy || '[]');
        if (likedBy.includes(user.username)) {
            likedBy.splice(likedBy.indexOf(user.username), 1);
            await db.run('UPDATE posts SET likes = likes - 1, likedBy = ? WHERE id = ?', [
                JSON.stringify(likedBy),
                postId
            ]);
        } else {
            likedBy.push(user.username);
            await db.run('UPDATE posts SET likes = likes + 1, likedBy = ? WHERE id = ?', [
                JSON.stringify(likedBy),
                postId
            ]);
        }
        res.redirect('/');
    } else {
        res.redirect('/error');
    }
}

async function renderProfile(req, res) {
    const user = await getCurrentUser(req);
    const userPosts = await db.all('SELECT * FROM posts WHERE username = ? ORDER BY timestamp DESC', [user.username]);
    res.render('profile', { user, posts: userPosts });
}

function handleAvatar(req, res) {
    const { username } = req.params;
    const user = findUserByUsername(username);
    if (user) {
        const letter = username.charAt(0).toUpperCase();
        const avatar = generateAvatar(letter);
        res.setHeader('Content-Type', 'image/png');
        res.send(avatar);
    } else {
        res.redirect('/error');
    }
}

async function findUserByUsername(username) {
    return await db.get('SELECT * FROM users WHERE username = ?', [username]);
}

async function findUserById(userId) {
    return await db.get('SELECT * FROM users WHERE id = ?', [userId]);
}

function generateAvatar(letter, width = 100, height = 100) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const backgroundColor = '#F333FF';

    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw letter
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${width / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, width / 2, height / 2);

    return canvas.toBuffer();
}

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

async function registerUser(req, res) {
    const { username } = req.body;

    // // Generate a unique hashedGoogleId
    // const hashedGoogleId = crypto.createHash('sha256').update(username + Date.now().toString()).digest('hex');
    // console.log("TEST")
    // console.log(req.session.hashedGoogleId);

    hashedGoogleId = req.session.hashedGoogleId;

    const existingUser = await db.get('SELECT * FROM users WHERE username = ? OR hashedGoogleId = ?', [username, hashedGoogleId]);
    if (existingUser) {
        res.redirect('/register?error=Username%20or%20hashedGoogleId%20already%20taken');
    } else {
        const result = await db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [username, hashedGoogleId, '', new Date().toISOString()]
        );
        req.session.userId = result.lastID;
        req.session.loggedIn = true;
        res.redirect('/');
    }
}

async function loginUser(req, res) {
    const { username } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    } else {
        res.redirect('/login?error=Invalid%20username');
    }
}

function logoutUser(req, res) {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/error');
        }
        res.redirect('/googleLogout');
    });
}

async function findUserByHashedGoogleId(hashedGoogleId) {
    try {
        const currUser = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', [hashedGoogleId]);
        return currUser; 
    } catch (err) {
        throw err;
    }
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});
