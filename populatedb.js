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
            tag TEXT, -- Single column for tag
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
        { username: 'FoodieFanatic', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 09:00:00' },
        { username: 'TechWhiz', hashedGoogleId: 'hashedGoogleId3', avatar_url: '', memberSince: '2024-01-03 10:00:00' },
        { username: 'HealthNut', hashedGoogleId: 'hashedGoogleId4', avatar_url: '', memberSince: '2024-01-04 11:00:00' },
        { username: 'SportsFan', hashedGoogleId: 'hashedGoogleId5', avatar_url: '', memberSince: '2024-01-05 12:00:00' },
        { username: 'EntertainmentBuff', hashedGoogleId: 'hashedGoogleId6', avatar_url: '', memberSince: '2024-01-06 13:00:00' },
        { username: 'EducationExpert', hashedGoogleId: 'hashedGoogleId7', avatar_url: '', memberSince: '2024-01-07 14:00:00' },
        { username: 'Fashionista', hashedGoogleId: 'hashedGoogleId8', avatar_url: '', memberSince: '2024-01-08 15:00:00' },
        { username: 'FinanceGuru', hashedGoogleId: 'hashedGoogleId9', avatar_url: '', memberSince: '2024-01-09 16:00:00' },
        { username: 'ScienceGeek', hashedGoogleId: 'hashedGoogleId10', avatar_url: '', memberSince: '2024-01-10 17:00:00' }
    ];

    const posts = [
        { title: 'Europe!', content: 'Just got back from an incredible trip through Europe.', username: 'TravelGuru', timestamp: '2024-01-01 10:00:00', likes: 0, likedBy: '[]', tag: 'Travel' },
        { title: 'The Ultimate Guide to Homemade Pasta', content: 'Learned how to make pasta from scratch.', username: 'FoodieFanatic', timestamp: '2024-01-02 12:00:00', likes: 0, likedBy: '[]', tag: 'Food' },
        { title: 'Latest Tech Trends', content: 'Exploring the latest trends in technology.', username: 'TechWhiz', timestamp: '2024-01-03 14:00:00', likes: 0, likedBy: '[]', tag: 'Technology' },
        { title: 'Healthy Living Tips', content: 'Some tips for maintaining a healthy lifestyle.', username: 'HealthNut', timestamp: '2024-01-04 16:00:00', likes: 0, likedBy: '[]', tag: 'Health' },
        { title: 'Top Sports Events', content: 'A review of the top sports events of the year.', username: 'SportsFan', timestamp: '2024-01-05 18:00:00', likes: 0, likedBy: '[]', tag: 'Sports' },
        { title: 'Best Movies of 2024', content: 'A list of the best movies released in 2024.', username: 'EntertainmentBuff', timestamp: '2024-01-06 20:00:00', likes: 0, likedBy: '[]', tag: null },
        { title: 'Online Learning Resources', content: 'The best online resources for learning new skills.', username: 'EducationExpert', timestamp: '2024-01-07 22:00:00', likes: 0, likedBy: '[]', tag: 'Education' },
        { title: 'Fashion Trends 2024', content: 'The latest fashion trends for 2024.', username: 'Fashionista', timestamp: '2024-01-08 09:00:00', likes: 0, likedBy: '[]', tag: 'Fashion' },
        { title: 'Managing Your Finances', content: 'Tips for managing your finances effectively.', username: 'FinanceGuru', timestamp: '2024-01-09 11:00:00', likes: 0, likedBy: '[]', tag: 'Finance' },
        { title: 'Space Exploration', content: 'Recent advancements in space exploration.', username: 'ScienceGeek', timestamp: '2024-01-10 13:00:00', likes: 0, likedBy: '[]', tag: 'Science' },
        { title: 'Healthy Eating on a Budget', content: 'How to eat healthy without breaking the bank.', username: 'FoodieFanatic', timestamp: '2024-01-11 15:00:00', likes: 0, likedBy: '[]', tag: null },
        { title: 'Tech and Education', content: 'How technology is changing education.', username: 'TechWhiz', timestamp: '2024-01-12 17:00:00', likes: 0, likedBy: '[]', tag: 'Technology' },
        { title: 'Fashionable Fitness Gear', content: 'The best fitness gear that is also fashionable.', username: 'Fashionista', timestamp: '2024-01-13 19:00:00', likes: 0, likedBy: '[]', tag: 'Fashion' },
        { title: 'Sports Science Innovations', content: 'Recent innovations in sports science.', username: 'SportsFan', timestamp: '2024-01-14 21:00:00', likes: 0, likedBy: '[]', tag: null }
    ];

    const comments = [
        { post_id: 1, username: 'FoodieFanatic', content: 'Wow, that sounds amazing!', timestamp: '2024-01-01 12:00:00' },
        { post_id: 2, username: 'TravelGuru', content: 'I need to try this recipe!', timestamp: '2024-01-02 14:00:00' },
        { post_id: 3, username: 'HealthNut', content: 'Very informative!', timestamp: '2024-01-03 16:00:00' },
        { post_id: 4, username: 'SportsFan', content: 'Great tips!', timestamp: '2024-01-04 18:00:00' },
        { post_id: 5, username: 'TechWhiz', content: 'I enjoyed reading this!', timestamp: '2024-01-05 20:00:00' }
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
            'INSERT INTO posts (title, content, username, timestamp, likes, likedBy, tag) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes, post.likedBy, post.tag]
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
