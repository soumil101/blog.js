const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

const dbFileName = 'microblog.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    // Clear existing tables
    await db.exec(`DROP TABLE IF EXISTS users;`);
    await db.exec(`DROP TABLE IF EXISTS posts;`);
    await db.exec(`DROP TABLE IF EXISTS comments;`);

    // Create tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL,
            likedBy TEXT,
            FOREIGN KEY (username) REFERENCES users(username)
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (username) REFERENCES users(username)
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'TravelGuru', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-01-01 08:00:00' },
        { username: 'FoodieFanatic', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 09:00:00' }
    ];

    const posts = [
        { title: 'Europe!', content: 'Just got back from an incredible trip through Europe.', username: 'TravelGuru', timestamp: '2024-01-01 10:00:00', likes: 0, likedBy: '[]' },
        { title: 'The Ultimate Guide to Homemade Pasta', content: 'Learned how to make pasta from scratch.', username: 'FoodieFanatic', timestamp: '2024-01-02 12:00:00', likes: 0, likedBy: '[]' }
    ];

    const comments = [
        { post_id: 1, username: 'FoodieFanatic', content: 'Wow, that sounds amazing!', timestamp: '2024-01-01 12:00:00' },
        { post_id: 2, username: 'TravelGuru', content: 'I need to try this recipe!', timestamp: '2024-01-02 14:00:00' }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes, likedBy) VALUES (?, ?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes, post.likedBy]
        );
    }));

    await Promise.all(comments.map(comment => {
        return db.run(
            'INSERT INTO comments (post_id, username, content, timestamp) VALUES (?, ?, ?, ?)',
            [comment.post_id, comment.username, comment.content, comment.timestamp]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});
