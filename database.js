const sqlite3 = require('sqlite3').verbose();

let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database('youtube_manager.db', async (err) => {
            if (err) {
                console.error('Error opening database', err);
                reject(err);
            } else {
                console.log('Database connected successfully');
                try {
                    await createTables();
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await initializeDefaultData();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            try {
                db.run('BEGIN TRANSACTION');

                db.run(`CREATE TABLE IF NOT EXISTS config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    gpt_api_key TEXT NOT NULL,
                    google_client_id TEXT NOT NULL,
                    google_client_secret TEXT NOT NULL,
                    global_video_path TEXT
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    google_id TEXT,
                    access_token TEXT,
                    refresh_token TEXT,
                    token_expiry DATETIME
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS channels (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    account_id INTEGER,
                    subscribers INTEGER,
                    views INTEGER,
                    language TEXT NOT NULL,
                    youtube_channel_id TEXT,
                    FOREIGN KEY(account_id) REFERENCES accounts(id)
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS sub_categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category_id INTEGER,
                    FOREIGN KEY(category_id) REFERENCES categories(id)
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS visibility (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS videos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    channel_id INTEGER,
                    views INTEGER,
                    publish_date TEXT,
                    description TEXT,
                    tags TEXT,
                    local_id TEXT,
                    youtube_video_id TEXT,
                    local_path TEXT,
                    thumbnail_path TEXT,
                    thumbnail_text TEXT,
                    thumbnail_remote TEXT,
                    category_id INTEGER,
                    default_language INTEGER,
                    visibility_id INTEGER,
                    kids BOOLEAN,
                    FOREIGN KEY(channel_id) REFERENCES channels(id),
                    FOREIGN KEY(category_id) REFERENCES categories(id),
                    FOREIGN KEY(default_language) REFERENCES languages(id),
                    FOREIGN KEY(visibility_id) REFERENCES visibility(id)
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS languages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    code TEXT NOT NULL
                )`);

                db.run('COMMIT');
                resolve();
            } catch (error) {
                db.run('ROLLBACK');
                reject(error);
            }
        });
    });
}

function initializeDefaultData() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM config", [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row.count === 0) {
                db.serialize(() => {
                    try {
                        db.run(`INSERT INTO config (id, gpt_api_key, google_client_id, google_client_secret, global_video_path) 
                            VALUES (1, "your_gpt_api_key_here", "your_google_client_id_here", "your_google_client_secret_here", NULL)`);

                        db.run(`INSERT INTO accounts (id, name, email) 
                            VALUES (1, "Demo Account", "demo@example.com")`);

                        db.run(`INSERT INTO channels (id, name, account_id, subscribers, views, language, youtube_channel_id) VALUES 
                            (1, "Demo Channel EN", 1, 0, 0, "en", "UCxxxxxxxxxxxxxxx"),
                            (2, "Demo Channel ES", 1, 0, 0, "es", "UCyyyyyyyyyyyyyyy")`);

                        db.run(`INSERT INTO categories (id, name) VALUES 
                            (1, "Film & Animation"),
                            (2, "Autos & Vehicles"),
                            (10, "Music"),
                            (15, "Pets & Animals"),
                            (17, "Sports"),
                            (19, "Travel & Events"),
                            (20, "Gaming"),
                            (22, "People & Blogs"),
                            (23, "Comedy"),
                            (24, "Entertainment"),
                            (25, "News & Politics"),
                            (26, "Howto & Style"),
                            (27, "Education"),
                            (28, "Science & Technology"),
                            (29, "Nonprofits & Activism")`);

                        db.run(`INSERT INTO visibility (id, name) VALUES 
                            (1, "public"),
                            (2, "private"),
                            (3, "unlisted")`);

                        db.run(`INSERT INTO languages (id, name, code) VALUES 
                            (1, "Urdu", "ur"),
                            (2, "Vietnamese", "vi"),
                            (3, "Italian", "it"),
                            (4, "Polish", "pl"),
                            (5, "Thai", "th"),
                            (6, "Turkish", "tr"),
                            (7, "German", "de"),
                            (8, "French", "fr"),
                            (9, "Korean", "ko"),
                            (10, "Japanese", "ja"),
                            (11, "Indonesian", "id"),
                            (12, "Arabic", "ar"),
                            (13, "Portuguese (Portugal)", "pt-PT"),
                            (14, "Russian", "ru"),
                            (15, "Hindi", "hi"),
                            (16, "Chinese", "zh"),
                            (17, "English", "en"),
                            (18, "English (United States)", "en-US"),
                            (19, "Spanish", "es"),
                            (20, "Spanish (Spain)", "es-ES"),
                            (21, "No linguistic content", "zxx")`);

                        db.run(`INSERT INTO videos (id, title, channel_id, views, publish_date, description, tags, local_id, youtube_video_id, category_id, default_language, visibility_id, kids) VALUES 
                            (1, "Demo Video 1", 1, 0, "2024-03-01", "This is a demo video description", "demo,test,video", "DEMO1", NULL, 28, 17, 1, 0),
                            (2, "Video de Prueba 1", 2, 0, "2024-03-01", "Esta es una descripción de prueba", "demo,prueba,video", "DEMO1", NULL, 28, 20, 1, 0)`);

                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            } else {
                resolve();
            }
        });
    });
}

function getAll(table) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM "${table}"`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function get(table, id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM "${table}" WHERE id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function insert(table, data) {
    return new Promise((resolve, reject) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(',');

        const sql = `INSERT INTO "${table}" (${keys.join(',')}) VALUES (${placeholders})`;

        db.run(sql, values, function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function update(table, id, data) {
    return new Promise((resolve, reject) => {
        const sets = Object.keys(data).map(key => `${key} = ?`).join(',');
        const values = [...Object.values(data), id];

        const sql = `UPDATE "${table}" SET ${sets} WHERE id = ?`;

        db.run(sql, values, function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function remove(table, id) {
    return new Promise((resolve, reject) => {
        if (table === 'accounts') {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                db.all('SELECT id FROM channels WHERE account_id = ?', [id], (err, channels) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }

                    const channelIds = channels.map(channel => channel.id);
                    if (channelIds.length > 0) {
                        db.run('DELETE FROM videos WHERE channel_id IN (' + channelIds.join(',') + ')', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return reject(err);
                            }
                        });
                    }

                    db.run('DELETE FROM channels WHERE account_id = ?', [id], (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                        }
                    });

                    db.run('DELETE FROM accounts WHERE id = ?', [id], function (err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                        }
                        db.run('COMMIT');
                        resolve(this.changes);
                    });
                });
            });
        } else {
            db.run(`DELETE FROM "${table}" WHERE id = ?`, [id], function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        }
    });
}

function getAccountByGoogleId(googleId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM accounts WHERE google_id = ?`, [googleId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function updateAccountTokens(id, accessToken, refreshToken, expiryDate) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE accounts SET access_token = ?, refresh_token = ?, token_expiry = ? WHERE id = ?`;
        db.run(sql, [accessToken, refreshToken, expiryDate, id], function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function getConfigValue(key) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT ${key} FROM config WHERE id = 1`, (err, row) => {
            if (err) reject(err);
            else resolve(row ? row[key] : null);
        });
    });
}

function updateChannelStats(id, subscribers, views) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE channels SET subscribers = ?, views = ? WHERE id = ?`;
        db.run(sql, [subscribers, views, id], function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function updateConfig(newConfig) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE config SET gpt_api_key = ?, google_client_id = ?, google_client_secret = ?, global_video_path = ? WHERE id = 1`;
        db.run(sql, [newConfig.gpt_api_key, newConfig.google_client_id, newConfig.google_client_secret, newConfig.global_video_path], function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function updateVideoDetails(id, data) {
    return new Promise((resolve, reject) => {
        const sets = Object.keys(data).map(key => `${key} = ?`).join(',');
        const values = [...Object.values(data), id];

        const sql = `UPDATE videos SET ${sets} WHERE id = ?`;

        db.run(sql, values, function (err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function getVideoByYoutubeId(youtubeId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM videos WHERE youtube_video_id = ?';
        db.get(sql, [youtubeId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getChannelByYoutubeId(youtubeChannelId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM channels WHERE youtube_channel_id = ?';
        db.get(sql, [youtubeChannelId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getVideoByLocalId(localId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM videos WHERE local_id = ?';
        db.get(sql, [localId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getChannelByName(channelName) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM channels WHERE name = ?';
        db.get(sql, [channelName], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getLanguageByCode(languageCode) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM languages WHERE code = ?';
        db.get(sql, [languageCode], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getVideoByLocalIdAndChannel(localId, channelId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM videos WHERE local_id = ? AND channel_id = ?';
        db.get(sql, [localId, channelId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = {
    initDatabase,
    getAll,
    get,
    insert,
    update,
    remove,
    getAccountByGoogleId,
    updateAccountTokens,
    getConfigValue,
    updateChannelStats,
    updateConfig,
    updateVideoDetails,
    getVideoByYoutubeId,
    getChannelByYoutubeId,
    getVideoByLocalId,
    getChannelByName,
    getLanguageByCode,
    getVideoByLocalIdAndChannel
};