const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const { createCanvas } = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

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
    res.locals.appName = 'blog.JS';
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

app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
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

app.get('/post/:id', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        res.render('post', { post });
    } else {
        res.redirect('/error');
    }
});

app.post('/posts', (req, res) => {
    const { title, content } = req.body;
    const user = getCurrentUser(req);
    if (user) {
        addPost(title, content, user);
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.post('/like/:id', (req, res) => {
    updatePostLikes(req, res);
});

app.get('/profile', isAuthenticated, (req, res) => {
    renderProfile(req, res);
});

app.get('/avatar/:username', (req, res) => {
    handleAvatar(req, res);
});

app.post('/register', (req, res) => {
    registerUser(req, res);
});

app.post('/login', (req, res) => {
    loginUser(req, res);
});

app.get('/logout', (req, res) => {
    logoutUser(req, res);
});

app.post('/delete/:id', isAuthenticated, (req, res) => {
    const postId = parseInt(req.params.id);
    const user = getCurrentUser(req);
    const postIndex = posts.findIndex(p => p.id === postId && p.username === user.username);
    if (postIndex !== -1) {
        posts.splice(postIndex, 1);
        res.redirect('/');
    } else {
        res.redirect('/error');
    }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

let posts = [
    { id: 1, title: 'Europe!', content: 'Just got back from an incredible trip through Europe. Visited some lesser-known spots that are truly breathtaking!.', username: 'TravelGuru', timestamp: '2024-01-01 10:00', likes: 0, likedBy: [] },
    { id: 2, title: 'The Ultimate Guide to Homemade Pasta', content: 'Learned how to make pasta from scratch, and it’s easier than you think. Sharing my favorite recipes and tips.', username: 'FoodieFanatic', timestamp: '2024-01-02 12:00', likes: 0, likedBy: [] },
    { id: 3, title: 'Top 5 Gadgets to Watch Out for in 2024', content: 'Tech enthusiasts, here’s my list of the top 5 gadgets to look out for in 2024. Let me know your thoughts!', username: 'TechSage', timestamp: '2024-01-02 12:00', likes: 0, likedBy: [] },
    { id: 4, title: 'Sustainable Living: Easy Swaps You Can Make Today', content: 'Making the shift to sustainable living is simpler than it seems. Sharing some easy swaps to get you started.', username: 'EcoWarrior', timestamp: '2024-01-02 12:00', likes: 0, likedBy: [] },
];
let users = [
    { id: 1, username: 'TravelGuru', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'FoodieFanatic', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
    { id: 3, username: 'TechSage', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
    { id: 4, username: 'EcoWarrior', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];

function findUserByUsername(username) {
    return users.find(user => user.username === username);
}

function findUserById(userId) {
    return users.find(user => user.id === userId);
}

function addUser(username) {
    const user = {
        id: users.length + 1,
        username: username,
        avatar_url: undefined,
        memberSince: new Date().toISOString(),
    };
    users.push(user);
    return user;
}

function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

function registerUser(req, res) {
    const { username } = req.body;
    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username%20already%20taken');
    } else {
        const user = addUser(username);
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
}

function loginUser(req, res) {
    const { username } = req.body;
    const user = findUserByUsername(username);
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
        res.redirect('/');
    });
}

function renderProfile(req, res) {
    const user = getCurrentUser(req);
    const userPosts = posts.filter(post => post.username === user.username);
    res.render('profile', { user, posts: userPosts });
}

function updatePostLikes(req, res) {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    const user = getCurrentUser(req);
    if (post && user) {
        if (post.likedBy.includes(user.username)) {
            post.likes -= 1;
            post.likedBy = post.likedBy.filter(username => username !== user.username);
        } else {
            post.likes += 1;
            post.likedBy.push(user.username);
        }
        res.redirect('/');
    } else {
        res.redirect('/error');
    }
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

function getCurrentUser(req) {
    return findUserById(req.session.userId);
}

function getPosts() {
    return posts.map(post => ({
        ...post,
        avatar_url: findUserByUsername(post.username).avatar_url
    })).reverse();
}

function addPost(title, content, user) {
    const newPost = {
        id: posts.length + 1,
        title: title,
        content: content,
        username: user.username,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        avatar_url: user.avatar_url,
    };
    posts.push(newPost);
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
