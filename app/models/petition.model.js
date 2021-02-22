const db = require("../../config/db");
const path = require("path");
const fs = require("fs");
const passwords = require("../models/passwords");

function close_nicely(connection_obj, statcode, finalise) {
  if (connection_obj != undefined) {
    connection_obj.release();
  }
  finalise(statcode);
}

exports.get_uid_from_token = async function (token) {
  if (token == null) {
    // ^^ FURTHER SAFETY CHECKING HERE TO DO
    return [];
  }
  try {
    //return the UserID if the token exists,
    const conn = await db.getPool().getConnection();
    const [uid] = await conn.query(
      "SELECT user_id as userID,auth_token AS token FROM User WHERE auth_token = ?",
      token
    );
    conn.release();
    return uid.length == 0 ? [] : uid;
  } catch (err) {
    //Default to return nothing.
    return [];
  }
};

exports.filename_to_mime = function (filename) {
  const refs = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
  };
  let a = refs[path.extname(filename)];
  return a ? a : false;
};

exports.verify_token = async function (token) {
  try {
    const conn = await db.getPool().getConnection();
    let result = await conn.query("SELECT * FROM User WHERE auth_token = ?", [
      token,
    ]);
    conn.release();
    return result;
  } catch (err) {
    return -1;
  }
};
exports.getpetition = async function (parameters, done) {
  let big_saucey_integer = 9223372036854775807;


  const sort_line = (() => {
    switch (parameters.sortBy) {
      case "SIGNATURES_ASC":
        return "ORDER BY count(Signature.petition_Id) ASC ";
      case "SIGNATURES_DESC":
        return "ORDER BY count(Signature.petition_Id) DESC ";
      case "ALPHABETICAL_ASC":
        return "ORDER BY title ASC ";
      case "ALPHABETICAL_DESC":
        return "ORDER BY title DESC ";
      default:
        return "ORDER BY count(Signature.petition_Id) DESC ";
    }
  })();

  const limit_offset = (() => {

    if (!(parameters.startIndex || parameters.count)) { return "" };



    if (parameters.count) {
      if (parameters.startIndex) { return ('LIMIT ' + parameters.startIndex + " , " + (Number(parameters.count) + Number(parameters.startIndex-1))) }
      return ('LIMIT ' + parameters.count + " ");
    } // we only return offset
    return ('LIMIT ' + parameters.startIndex + ", " + big_saucey_integer + " ");



  })();

  try {
    const conn = await db.getPool().getConnection();

    const sql =
      "SELECT  Petition.petition_Id AS petitionId,title, Category.name as category, User.name AS authorName, count(Signature.petition_Id) As signatureCount " +
      "FROM Petition JOIN Category " +
      "ON Petition.category_id = Category.category_id " +
      "JOIN User " +
      "ON Petition.author_id = User.user_id " +
      "LEFT JOIN Signature " +
      "ON Petition.petition_id = Signature.petition_id " +
      "WHERE TRUE " +
      // Filter by specific catID if it is supplied
      (parameters.categoryId != null
        ? "AND Petition.category_id = " + parameters.categoryId + " "
        : " ") +
      // Filter by specific authID if it is supplied
      (parameters.authorId != null
        ? "AND Petition.author_id = " + parameters.authorId + " "
        : " ") +
      // Filter by contained word if it is supplied
      (parameters.q != null
        ? "AND Petition.title LIKE '%" + parameters.q + "%' "
        : " ") +
      "GROUP BY Signature.petition_Id " +
      sort_line +
      limit_offset;

 

    const data = await conn.query(sql).then(value => {
      value = value[0]
      return value;
    })

    return passwords.close_nicely(conn, data, done)


  } catch (err) {
    console.log(err);
    return passwords.close_nicely(conn, 500, done);
  }
}



exports.getpetition2 = async function (req) {
  console.log(req.query.q);
  const q = req.query.q;
  const catid = req.query.categoryId;
  const authid = req.query.bacon;
  const startIndex = req.query.startIndex;

  let line = "";
  switch (req.query.sortBy) {
    case "SIGNATURES_ASC":
      line = "ORDER BY count(Signature.petition_Id) ASC ";
      break;
    case "SIGNATURES_DESC":
      line = "ORDER BY count(Signature.petition_Id) DESC ";
      break;
    case "ALPHABETICAL_ASC":
      line = "ORDER BY title DESC ";
      break;
    case "ALPHABETICAL_DESC":
      line = "ORDER BY title ASC ";
      break;
    default:
      line = "ORDER BY count(Signature.petition_Id) ASC ";
  }

  try {
    const conn = await db.getPool().getConnection();
    const query =
      "SELECT  Petition.petition_Id AS petitionId,title, Category.name as category, User.name AS authorName, count(Signature.petition_Id) As signatureCount " +
      "FROM Petition JOIN Category " +
      "ON Petition.category_id = Category.category_id " +
      "JOIN User " +
      "ON Petition.author_id = User.user_id " +
      "LEFT JOIN Signature " +
      "ON Petition.petition_id = Signature.petition_id " +
      "WHERE TRUE " +
      // Filter by specific catID if it is supplied
      (req.query.categoryId != null
        ? "AND Petition.category_id = " + req.query.categoryId + " "
        : " ") +
      // Filter by specific authID if it is supplied
      (req.query.authorId != null
        ? "AND Petition.author_id = " + req.query.authorId + " "
        : " ") +
      // Filter by contained word if it is supplied
      (req.query.q != null
        ? "AND Petition.title LIKE '%" + req.query.q + "%' "
        : " ") +
      "GROUP BY Signature.petition_Id " +
      line;

    //petition_Id AS peitionId,title,category_id
    let rows = await conn.query(query);
    rows = rows.slice(0, -1);
    conn.release();
    // DOES STILL NEEDLESSLY PULL IN THE BUFFER SHIT
    return rows;
  } catch (err) {
    console.log(err.sql);
    throw err;
  }
};

exports.getpetbyID = async function (id) {
  try {
    const conn = await db.getPool().getConnection();
    const query2 =
      "SELECT Petition.petition_id AS petitionId,  title, Category.name as category, User.name AS authorName, count(Signature.petition_Id) As signatureCount, " +
      "description, User.user_id as authorId, User.city as authorCity, User.country as authorCountry, Petition.created_date, Petition.closing_date " +
      "FROM Petition Join Category " +
      "ON Petition.category_id = Category.category_id " +
      "JOIN User " +
      "ON Petition.author_id = User.user_id " +
      "LEFT JOIN Signature " +
      "ON Petition.petition_id = Signature.petition_id " +
      "WHERE Petition.petition_id = " +
      id +
      " " +
      "GROUP BY Signature.petition_Id";

    let rows = await conn.query(query2).then((value) => {
      value = value[0];

      return value.length != 0 ? value[0] : null;
    });
    conn.release();

    if (!rows) {
      return 0;
    }

    return rows;
  } catch (err) {
    throw err;
  }
};

exports.postPetition = async function (token, body, done) {
  try {
    var conn = await db.getPool().getConnection();

    const is_valid_category = conn
      .query("SELECT DISTINCT category_id FROM Petition")
      .then((value) => {
        return value[0];
      });

    const user_id = passwords.get_uid_from_token(token).then((value) => {
      return value.length != 0 ? Object.assign({}, value[0]) : null;
    });

    const results = await Promise.all([is_valid_category, user_id]);
    if (!results[1]) {
      return await passwords.close_nicely(conn, 401, done);
    } // The token is not a user login
    if (results[0].length == 0) {
      return await passwords.close_nicely(conn, 400, done);
    } // edge case for no categories
    const valid_cat = (function () {
      for (let a of results[0]) {
        if (a.category_id == body.categoryId) {
          return true;
        }
      }
      return false;
    })();
    console.log(results);
    if (!valid_cat) {
      return await passwords.close_nicely(conn, 400, done);
    } // supplied category is invalid
    const values = [
      body.title,
      body.description,
      results[1].userId,
      body.categoryId,
      passwords.current_timedate(),
      //now
      body.closingDate,
    ];

    const sql =
      "INSERT INTO Petition (title,description,author_id,category_id, created_date ,closing_date ) VALUES (?)";
    const now = await conn.query(sql, [values]).then((value) => {
      value = value[0];
      if (value.affectedRows == 1) {
        return { petitionId: value.insertId };
      }
      return null;
    });
    conn.release();
    if (!now) {
      return await passwords.close_nicely(conn, 400, done);
    }
    return await passwords.close_nicely(conn, now, done);
  } catch (err) {
    console.log(err);
    passwords.close_nicely(conn, 500, done);
  }
};

exports.patchpetition = async function (token, body, id, done) {
  //   console.log(token,body,id);
  function simple_in_list(val, l_in) {
    // seriously? Seems too complicated to implement this in JS?
    let flag = false;
    for (thing of l_in) {
      if (thing.category_id == val) {
        flag = true;
        break;
      }
    }
    return flag;
  }

  async function get_all_petitions(body) {
    if (body.categoryId) {
      return await conn
        .query("SELECT DISTINCT category_id FROM Category")
        .then((value) => {
          value = value[0];
          return simple_in_list(body.categoryId, value);
        });
    } else {
      return true;
    }
  }

  //sanity check

  try {
    if (Object.keys(body).length == 0) {
      return passwords.close_nicely(conn, 400, done);
    }
    var conn = db.getPool();
    const all_petitions = get_all_petitions(body);

    const user_info = passwords.get_uid_from_token(token).then((value) => {
      return value.length != 0 ? Object.assign({}, value[0]) : null;
    });

    const pet_info = conn
      .query(
        "SELECT closing_date,author_id FROM Petition WHERE petition_id = ?",
        id
      )
      .then((value) => {
        value = value[0];
        if (value == [] || value.length == 0) {
          return -1;
        }
        return {
          okay: body.closingDate
            ? passwords.compare_dates(body.closingDate, value[0].closing_date)
            : true,
          user_id: value[0].author_id,
        };
      });

    const values = await Promise.all([all_petitions, user_info, pet_info]);
    console.log(values)
    if (!values[0]) {
      return await passwords.close_nicely(conn, 400, done);
    } // petition category is bad'
    if (values[2] == -1) {
      return await passwords.close_nicely(conn, 404, done);
    } // petition not found
    if (!values[2].okay) {
      return await passwords.close_nicely(conn, 400, done);
    } // new date older than
    if (values[2] == -1) {
      return await passwords.close_nicely(conn, 404, done);
    } // petition not found
    if (!values[1]) {
      return await passwords.close_nicely(conn, 401, done);
    } //auth token not in db
    if (values[1].userId != values[2].user_id) {
      return passwords.close_nicely(conn, 403, done);
    } // User is FORBIDDEN (authid no match)

    // a lot of these condition blocks here. Woohoo.

    if (body.closingDate) {
      body["closing_date"] = body.closingDate;
      delete body.closingDate;
    }
    if (body.categoryId) {
      body["category_id"] = body.categoryId;
      delete body.categoryId;
    }

    let query_list = [];
    let sql = "UPDATE Petition SET ";
    let keys = Object.keys(body);

    for (let key of keys) {
      query_list.push(body[key]);
      sql += key + " = ? , ";
    }
    sql = sql.slice(0, -2);
    sql += "WHERE petition_id = ? ";
    query_list.push(id);

    const end = await conn.query(sql, query_list);
    return passwords.close_nicely(conn, 200, done);
    throw 0; // spook
  } catch (err) {
    console.log(err);
    passwords.close_nicely(conn, 500, done);
  }
};

exports.deletepetition = async function (token, petid, done) {
  try {
    console.log("HERE", token, petid);
    const conn = await db.getPool().getConnection();
    const [user_info] = await this.get_uid_from_token(token);
    if (user_info == [] || user_info == undefined || user_info.length == 0) {
      conn.release();
      done(401);
      return;
    }

    const [
      pet_info,
    ] = await conn.query(
      "SELECT author_id FROM Petition WHERE petition_id = ?",
      [petid]
    );

    if (pet_info == [] || pet_info == undefined || pet_info.length == 0) {
      conn.release();
      done(404);
      return;
    }

    if (!(pet_info[0].author_id == user_info.userID)) {
      conn.release();
      done(403);
      return;
    }

    const deletedresult = await conn.query(
      "DELETE  FROM Petition WHERE petition_id = ?",
      [petid]
    );
    if (
      pet_info == [] ||
      pet_info == undefined ||
      pet_info.length == 0 ||
      deletedresult[0].affectedRows == 0
    ) {
      conn.release();
      done(404);
      return;
    }

    conn.release();
    done(200);
    return;
  } catch (err) {
    console.log(err);
    done(500);
    return;
  }
};

exports.getCategory = async function (done) {
  try {
    const conn = await db.getPool().getConnection();
    const query = "SELECT category_id AS categoryId,name FROM Category";
    let rows = await conn.query(query).then((value) => {
      return value[0];
    });

    conn.release();
    done(rows);
  } catch (err) {
    throw err;
  }
};


exports.getheroimage2 = async function (id, done) {
  //sanity checks

  try {
    var conn = await db.getPool().getConnection();

    const pet_info = await conn.query('SELECT photo_filename FROM Petition WHERE petition_id = ?', id).then(value => {
      value = value[0];
      if (value.length == 0) { return null }
      return (value[0].photo_filename);
    })
    conn.release();
    if (!pet_info) { console.log("END"); return await passwords.close_nicely(conn, 404, done); } //image not found (in db)


  } catch (err) {
    console.log(err);
    return passwords.close_nicely(conn, 500, done);
  }


}



exports.getheroimage = async function (id, done) {
  //   done(500);

  try {
    var conn = await db.getPool().getConnection();

    const pet_info = await conn.query('SELECT photo_filename FROM Petition WHERE petition_id = ?', id).then(value => {
      value = value[0];
      if (value.length == 0) { return null }
      return (value[0].photo_filename);
    });
    conn.release();
    if (!pet_info) { return await passwords.close_nicely(conn, 404, done); } //image not found (in db)
    if (!fs.existsSync(passwords.photo_dir + pet_info)) { return await passwords.close_nicely(conn, 404, done) } // file doesnt exist in fs
    const file = path.resolve(passwords.photo_dir + pet_info);
    const MimeType = passwords.filename_to_mime(pet_info);
    return passwords.close_nicely(conn, { file, MimeType }, done)


  } catch (err) {
    console.log(err)
    return passwords.close_nicely(null, 500, done);
  }


};




exports.putheroimage = async function (petid, token, type, image, done) {

}

exports.putheroimage = async function (petid, token, type, image, done) {
  // sanity checks
  if (!passwords.is_valid_image(type)) {
    return done(400);
  }


  async function update_db_photoname(conn, photo_name, petid) {
    if (!photo_name) {
      return false;
    }
    return await conn
      .query("UPDATE Petition SET photo_filename = ? WHERE petition_id = ?", [
        photo_name,
        petid,
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
    } // the image type is not valid

    const user_id = passwords.get_uid_from_token(token).then((value) => {
      return value.length != 0 ? Object.assign({}, value[0]) : null;
    });
    const petition_info = conn
      .query(
        "SELECT petition_id, photo_filename, author_id FROM Petition WHERE petition_id = ?",
        [petid]
      )
      .then((value) => {
        return value[0].length != 0 ? Object.assign({}, value[0][0]) : null;
      });

    const results = await Promise.all([user_id, petition_info]);
    if (!results[1]) {
      return await passwords.close_nicely(conn, 404, done);
    } //No petition at petitionID
    if (!results[0]) {
      return await passwords.close_nicely(conn, 401, done);
    } //No usr associated with token or the token is invalid
    
    if (results[0].userId != results[1].author_id) {
      return await passwords.close_nicely(conn, 403, done);
    } // Author is not the logged in user

    //  const file_name = (results[1].filename ? results[1].file_name : passwords.generate_filename(type,results[0].userId,petid));
    // WE SHOULD ALWAYS GENERATE A NEW FILENAME!!!
    const file_name = passwords.generate_filename(
      type,
      results[0].userId,
      petid
    );


    const write = await fs.writeFile(passwords.photo_dir + file_name, image, function (err) {
      if (err) {
        console.log(err)
        return false
      } return true
    })


    // const write = request.pipe(
    //   fs.createWriteStream(passwords.photo_dir + file_name)
    // );

    const delete_old = delete_old_file(file_name, results[1].photo_filename);
    const update_db = update_db_photoname(conn, file_name, petid).then(
      (value) => {
        return value;
      }
    );

    const write_work = await Promise.all([write, update_db, delete_old]);
    if (!write_work[1]) {
      throw 0;
    } // there was an error writing the db spook
    return await passwords.close_nicely(conn, 200, done);
  } catch (err) {
    console.log(err);
    await passwords.close_nicely(conn, 500, done);
  }
};
