const db = require("../../config/db");
const passwords = require("./passwords");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function hash_password(str_in) {
  return passwords.hash(str_in);
}

function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

exports.get_uid_from_token = async function (token) {
  if (token == null) {
    //safety net
    return 0;
  }
  try {
    //return the UserID if the token exists,
    const conn = await db.getPool().getConnection();
    const [uid] = await conn.query(
      "SELECT user_id as userId,auth_token AS token FROM User WHERE auth_token = ?",
      token
    );
    if (uid.length == 0) {
      console.log("the token does not exist in the db");
      return 0;
    }
    return uid;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.create_new = async function (body, done) {
  if (!passwords.valid_email(body.email)) {
    passwords.close_nicely(null, 400, done);
  }

  try {
    var conn = await db.getPool().getConnection();
    const password = passwords.hash(body.password);
    const sql =
      "INSERT INTO User (name,email,password,city,country) VALUES (?)";
    const values = [[body.name, body.email, password, body.city, body.country]];

    const update_db = await conn
      .query(sql, values)
      .then((values) => {
        values = values[0];
        return values.insertId;
      })
      .catch((e) => {
        return e.errno == 1062 ? -1 : -2;
      });

    conn.release();

    if (update_db == -1) {
      return await passwords.close_nicely(conn, 400, done);
    } //bad request : duplicate entry
    if (update_db == -2) {
      return await passwords.close_nicely(conn, 500, done);
    } //some other error

    return await passwords.close_nicely(conn, { userId: update_db }, done);
  } catch (err) {
    console.log(err);
    return await passwords.close_nicely(conn, 500, done);
  }
};

exports.getUser = async function (id, token, done) {
  if (isNaN(id)) {
    return passwords.close_nicely(null, 404, done);
  }
  try {
    var conn = await db.getPool().getConnection();
    if (token) {
      var user_id = await passwords.get_uid_from_token(token).then((value) => {
        if (value) {
          return Object.assign({}, value[0]).userId;
        }
        return null;
      });
    }
    // user_id is null if you are not the owner
    const query =
      user_id != id
        ? "SELECT name,city,country FROM User WHERE user_id = ?"
        : "SELECT name,city,country,email FROM User WHERE user_id = ?";
    const results = await conn.query(query, [id]).then((value) => {
      value = value[0][0];
      if (value == undefined) {
        return passwords.close_nicely(conn, 404, done);
      } else return Object.assign({}, value);
    });
    return passwords.close_nicely(conn, results, done);
  } catch (err) {
    console.log(err);
    passwords.close_nicely(conn, 500, done);
  }
};

exports.login = async function (body, done) {
  if (!body.password || !body.email) {
    passwords.close_nicely(null, 400, done);
    return;
  }
  try {
    var conn = await db.getPool().getConnection();
    const token = passwords.generate_token();
    // we have to go through iteratively here. There is no option :(
    const results = await conn
      .query(
        "UPDATE User SET auth_token = ? WHERE email = ? AND password = ?",
        [token, body.email, passwords.hash(body.password)]
      )
      .then(async (value) => {
        if (value[0].affectedRows == undefined || value[0].affectedRows == 0) {
          passwords.close_nicely(conn, 400, done);
          return;
        } else {
          const [uid, rows] = await passwords.get_uid_from_token(token);
          if (!uid) {
            passwords.close_nicely(conn, 500, done);
            return;
          }
          return uid;
        }
      });
    if (results) {
      let a = Object.assign({}, results);
      // a['userID'] = a['userId']

      passwords.close_nicely(conn, a, done);
    } else {
      passwords.close_nicely(conn, 500, done);
    }
    return;
  } catch (err) {
    console.log(err);
    passwords.close_nicely(conn, 500, done);
  }
};

exports.logout = async function (req, done) {
  try {
    const token = req.get("X-Authorization");
    const conn = await db.getPool().getConnection();
    const update = "UPDATE User SET auth_token = NULL WHERE auth_token = ? ";
    let [rows] = await conn.query(update, [token]);
    conn.release();
    done(rows.affectedRows);
  } catch (err) {
    done(-1);
  }
};

exports.update = async function (token, id, body, done) {
  async function check_email(conn, body, id) {
    if (body.email) {
      if (!passwords.valid_email(body.email)) {
        return false;
      }
      return await conn
        .query("SELECT user_id FROM User WHERE email = ?", body.email)
        .then((value) => {
          value = value[0];
          return value.length != 0;
        });
    }
    return true;
  }

  async function check_password(conn, uid, body) {
    // -1 : No need to care, no update password
    // -2 : update but did not provide the old password
    // -3 : The old passsword does not match our record
    if (!body.password) {
      return -1;
    }
    if (!body.currentPassword) {
      return -2;
    }
    return await passwords
      .confirm_password(uid, body.currentPassword)
      .then((value) => {
        return value ? 1 : -3;
      });
  }

  try {
    const conn = await db.getPool().getConnection();
    const email_verif = check_email(conn, body, id);
    const does_user_id_exist = conn
      .query("SELECT * FROM User WHERE user_id = ? ", id)
      .then((value) => {
        value = value[0];
        return !(value == undefined || value.length == 0);
      });
    const uid = passwords.get_uid_from_token(token).then((value) => {
      return value.length != 0 ? Object.assign({}, value[0]) : false;
    });
    const results = await Promise.all([email_verif, uid, does_user_id_exist]);

    if (!results[1]) {
      await passwords.close_nicely(conn, 401, done);
    } // token does not exist in dbc
    if (!results[2]) {
      await passwords.close_nicely(conn, 404, done);
    }
    
    if (!results[0]) {
      await passwords.close_nicely(conn, 400, done);
    } //Email is not unique
    if (results[1].userId != id) {
      await passwords.close_nicely(conn, 403, done);
    }

    const user_id = results[1].userId;

    const pass_verify = await check_password(conn, user_id, body);
    if (pass_verify == -2) {
      await conn.release();
      return passwords.close_nicely(conn, 400, done);
    }
    if (pass_verify == -3) {
      await passwords.close_nicely(conn, 403, done);
    }
    delete body.currentPassword;
    conn.release();
    console.log("GOT TO QUERY");
    let query_list = [];
    let sql = "UPDATE User SET ";
    let keys = Object.keys(body);
    body.password = passwords.hash(body.password);
    for (let key of keys) {
      query_list.push(body[key]);
      sql += key + " = ? , ";
    }
    sql = sql.slice(0, -2);
    sql += "WHERE user_id = ? ";
    query_list.push(user_id);

    await conn.query(sql, query_list);

    await passwords.close_nicely(conn, 200, done);
  } catch (err) {
    console.log(err);
    return passwords.close_nicely(null, 500, done);
  }
};

exports.getuserphoto = async function (id, done) {
  //we shall return a { : } object; assume type is valid;
  try {
    const conn = await db.getPool().getConnection();
    const file_name = await conn
      .query("SELECT photo_filename FROM User WHERE user_id = ?", [id])
      .then((value) => {
        value = value[0];
        if (value.length == 0) {
          return false;
        } // the user does not exist
        return Object.assign({}, value[0]);
      });

    if (!file_name) {
      conn.release();
      return await passwords.close_nicely(conn, 404, done);
    }
    if (!file_name.photo_filename) {
      conn.release();
      return await passwords.close_nicely(conn, 404, done);
    }

    if (!fs.existsSync(passwords.photo_dir + file_name.photo_filename)) {
      {
        conn.release();
        return await passwords.close_nicely(conn, 404, done);
      }
    }
    var file = path.resolve(
      path.join(passwords.photo_dir + file_name.photo_filename)
    );
    if ((MimeType = passwords.filename_to_mime(file_name.photo_filename))) {
      conn.release();
      done({ file, MimeType });
      return;
    }

    conn.release();
    return await passwords.close_nicely(conn, 404, done);
  } catch (err) {
    console.log(err);
    return await passwords.close_nicely(conn, 500, done);
  }
};

exports.putuserimage = async function (userId, token, type, image, done) {
  //sanity checks ---

  //
  async function update_db_photoname(conn, photo_name, userid) {
    if (!photo_name) {
      return false;
    }
    return await conn
      .query("UPDATE User SET photo_filename = ? WHERE user_id = ?", [
        photo_name,
        userid,
      ])
      .then((value) => {
        return value[0].affectedRows ? true : false;
      });
  }

  async function delete_old_file(filename, db_filename) {
    // DELETE THE OLD FILE IF THERE IS A NEW FILENAME; ALL FILENAME SHALL CONFORM TO OUR STANDARD I SAY!
    if (filename != db_filename) {
      fs.unlink(passwords.photo_dir + db_filename, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
      return true;
    }
    return true;
  }

  try {
    var conn = await db.getPool().getConnection();
    if (!passwords.image_types[type]) {
      return await passwords.close_nicely(conn, 400, done);
    } //the image type is not supported

    const user_id = passwords.get_uid_from_token(token).then((value) => {
      return value.length != 0 ? Object.assign({}, value[0]) : null;
    });

    const user_info = conn
      .query("SELECT * FROM User WHERE user_id = ? ", userId)
      .then((value) => {
        return value[0].length != 0 ? Object.assign({}, value[0][0]) : null;
      });

    const results = await Promise.all([user_id, user_info]);

    if (!results[0]) {
      return await passwords.close_nicely(conn, 401, done);
    } //No user associated with token or the token is invalid
    if (!results[1]) {
      return await passwords.close_nicely(conn, 404, done);
    } //No user at userid
    if (results[0].userId != results[1].user_id) {
      return await passwords.close_nicely(conn, 403, done);
    } // user request is not the logged in user

    const file_name = passwords.generate_user_filename_photo(userId, type);

    //block two
    // const write = request.pipe(
    //   fs.createWriteStream(passwords.photo_dir + file_name)
    // );

    const write =  fs.writeFileSync(passwords.photo_dir + file_name,image,function(err) { 
      if (err) { 
        return false
      } return true
    })

    


    const delete_old = delete_old_file(file_name, results[1].photo_filename);
    const update_db = update_db_photoname(conn, file_name, userId).then(
      (value) => {
        return value;
      }
    );

    const write_work = await Promise.all([write, update_db, delete_old]);

    if (!write_work[1]) {
      throw 0;
    } // there was an error writing the db spook


    if (results[1].photo_filename){
        return await passwords.close_nicely(conn, 200, done);
    } return await passwords.close_nicely(conn, 201, done);






  } catch (err) {
    console.log(err);
    await passwords.close_nicely(conn, 500, done);
  }
};

exports.deleteuserimage = async function (userId, token, done) {
  //sanity checks


  // async function clear_photo_from_db

  try {
    var conn = await db.getPool().getConnection();
    const user_id = passwords.get_uid_from_token(token).then((value) => {
      return value.length != 0 ? Object.assign({}, value[0]) : null;
    });

    const user_info = await conn
      .query("SELECT * FROM User WHERE user_id = ? ", userId)
      .then((value) => {
        return value[0].length != 0 ? Object.assign({}, value[0][0]) : null;
      });

    const results = await Promise.all([user_id, user_info]);




    if (!results[1]) {
      return await passwords.close_nicely(conn, 404, done);
    } //No user at userid
    if (!results[1].photo_filename) {
      return await passwords.close_nicely(conn, 404, done);
  }

   
    if (!results[0]) {
      return await passwords.close_nicely(conn, 401, done);
    } //No user associated with token or the token is invalid

    if (results[0].userId != results[1].user_id) {
      return await passwords.close_nicely(conn, 403, done);
    } // user request is not the logged in user
 

    const sql = ('UPDATE User SET photo_filename = NULL WHERE user_id = ?');
    const delete_from_db = await conn.query(sql,results[0].userId);
    conn.release();


    fs.unlink(passwords.photo_dir + results[1].photo_filename, (err) => { 
        if (err) {
            return  passwords.close_nicely(conn, 404, done); // image file is not found.
        } else {
            return passwords.close_nicely(conn, 200, done);                            
        }
    });

    
    




  } catch (err) {
    console.log(err);
    passwords.close_nicely(conn, 500, done);


  }
};
