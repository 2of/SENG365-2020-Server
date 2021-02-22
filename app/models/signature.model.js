const db = require('../../config/db');
const passwords = require("../models/passwords");


verify_token = async function (token) {
    try {
        const conn = await db.getPool().getConnection();
        const sql = ('SELECT * FROM User WHERE auth_token = ?');
        const [result] = await conn.query(sql, [token]);
        console.log("USER: \n", result);
        conn.release();
        return result;
    } catch (err) {
        return -1
    }
}




exports.sign_petition = async function (pet_id, token, done) {
    try {
        var conn = await db.getPool().getConnection();
        const user_id = await passwords.get_uid_from_token(token).then((value) => {
            return value.length != 0 ? Object.assign({}, value[0]) : null;
        });
        const pet_info = await conn.query('SELECT * FROM Petition WHERE petition_id = ?', [pet_id]).then(value => {
            value = value[0]
            return value.length != 0 ? Object.assign({}, value[0]) : null;
        });

        const results = await Promise.all([user_id, pet_info]);

        if (!user_id) { conn.release(); return await passwords.close_nicely(conn, 401, done) } //token has no association
        if (!pet_info) { conn.release(); return await passwords.close_nicely(conn, 404, done) }
        if (passwords.isdatefuture(pet_info)) { conn.release; return await passwords.close_nicely(conn, 403, done) };

        const sql = ('INSERT INTO Signature (signatory_id, petition_id, signed_date) VALUES (?)')
        const values = [[user_id.userId, pet_id, passwords.current_timedate()]];


        const update_db = await conn
            .query(sql, values)
            .then((values) => {
                values = values[0];
                return values.insertId;
            })
            .catch((e) => {
                return e.errno == 1062 ? -1 : -2;
            });

        if (update_db == -1) { conn.release(); return await passwords.close_nicely(conn, 403, done) };// duplicate
        if (update_db == -2) { conn.release(); throw (0); }
        else { conn.release(); return await passwords.close_nicely(conn, 200, done) };
        throw (0);





    } catch (err) {
        console.log(err);
        return passwords.close_nicely(conn, 500, done);
    }
}



exports.deletesignature = async function (token, pet_id, done) {
    try {
        var conn = await db.getPool().getConnection();

        const user_id = await passwords.get_uid_from_token(token).then((value) => {
            return value.length != 0 ? Object.assign({}, value[0]) : null;
        });
        if (!user_id) { conn.release(); return await passwords.close_nicely(conn, 401, done) }


        const pet_info = await conn.query('SELECT * FROM Petition WHERE petition_id = ?', [pet_id]).then(value => {
            value = value[0]
            return value.length != 0 ? Object.assign({}, value[0]) : null;
        });

        if (!pet_info) { conn.release(); return await passwords.close_nicely(conn, 404, done) }// no signature for id, uid

        if (!passwords.isdatefuture(pet_info.closing_date)) { conn.release(); return await passwords.close_nicely(conn, 403, done) } //expired petition



        const signature = await conn.query('SELECT * FROM Signature WHERE signatory_id = ? AND petition_id = ?', [user_id.userId, pet_id]).then(value => {
            value = value[0]
            return value.length != 0 ? Object.assign({}, value[0]) : null;
        });
        if (!signature) { conn.release(); return await passwords.close_nicely(conn, 403, done) }// no signature for id, uid
        if (pet_info.author_id == user_id.userId) { console.log("HER"); conn.release(); return await passwords.close_nicely(conn, 403, done) } // user is author



        const remove_from_db = await conn.query('DELETE FROM Signature WHERE signatory_id = ? AND petition_id = ?', [user_id.userId, pet_id]).then(value => {
            value = value[0];
            return (value.affectedRows == 1);
        })

        if (remove_from_db) { conn.release(); return await passwords.close_nicely(conn, 200, done) }
        throw (0);



    } catch (err) {
        console.log(err);
        passwords.close_nicely(conn, 500, done);
    }


}



exports.getsignature = async function (id, done) {
    try {
        console.log("HELLO THERE", id)
        var conn = await db.getPool().getConnection();
        const sql = 'SELECT signatory_id AS signatoryId,name,city,country,signed_date AS signedDate ' +
            'FROM Signature JOIN User ON User.user_id = Signature.signatory_id ' +
            'JOIN Petition ON Signature.petition_id = Petition.petition_id ' +
            'WHERE Petition.petition_id = ? ' +
            'ORDER BY signed_date asc';

        const results = await conn.query(sql, id).then(values => {
            return values[0]
        })
        passwords.close_nicely(conn, results, done);
        return;


    } catch (err) {
        console.log(err);
        passwords.close_nicely(conn, 500, done);
        return;
    }
}
