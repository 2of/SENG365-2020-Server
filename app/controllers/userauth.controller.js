const user_funcs = require("../models/user.model");
const tools = require("../models/passwords");
const passwords = require("../models/passwords");

exports.create_new2 = async function (req, res) {
  if (false) {
    // Code for checking the validity of the body params shall go here
    // check email etc is valid
  }
  await user_funcs.create_new(req.body, function (result) {
    try {
      if (result == -1) {
        throw 0;
      } else if (result == -2) {
        return res.status(400).send("Bad Request");
      } else if (result == -3) {
      } else {
        return res.status(200).send(result);
      }
    } catch (err) {
      return res.status(500).send("Internal Server Error");
    }
  });
};

exports.create_new = async function (req, res) {
  //sanity check
  // 1: Provided necessary fields
  if (!req.body.email || !req.body.password || !req.body.name) {
    return res.status(400).send();
  }
  if (!passwords.valid_email(req.body.email)) { 
    return res.status(400).send();
  }

  try {
    await user_funcs.create_new(req.body, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else {
        return res.status(201).send(value);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
};

exports.getInfoSingleUser = async function (req, res) {
  if (!req.params.id) {
    res.status(404).send();
    return;
  }
  try {
    const result = await user_funcs.getUser(
      req.params.id,
      req.get("X-Authorization"),
      function (value) {
        console.log(value);
        switch (value) {
          case 500:
            throw 0;
            break;
          case 404:
            res.status(404).send();
            break;
          default:
            res.status(200).send(value);
        }
      }
    );
  } catch (err) {
    res.status(500).send();
  }
};



exports.login = async function (req, res) {
  let parameters = Object.assign(req.body);
  try {
    const result = user_funcs.login(parameters, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else {
        return res.status(200).send(value);
      }
    });
  } catch (err) {
    return res.status(500).send();
  }
};

exports.update = async function (req, res) {
  let token = req.get("X-Authorization");
  if (token === undefined) {
    return res.status(401).send();
  }

  if(req.body.constructor === Object && Object.keys(req.body).length === 0) {
    return res.status(400).send(); // 400 when there is NO provided change
  }

  let id = req.params.id;
  let user_data = Object.assign({}, req.body);

  // to-do: Double check
  if (
    !("password" in req.body) ||
    !("currentPassword" in req.body && "password" in req.body) ||
    ("email" in req.body && !tools.valid_email(req.body["email"]))
  ) {
    res.status(400);
  }

  if ("email" in req.body && !tools.valid_email(req.body["email"])) {
    console.log("EMAIL OK");
  }

  await user_funcs.update(token, id, user_data, function (result) {
    try {
      if (Number.isInteger(result)) {
        return res.status(result).send();
      } else return res.status(200).send(result);
    } catch (err) {
      console.log(err);
      return res.status(500).send();
    }
  });
};

exports.logout = async function (req, res) {
  // RECEIVES THE NUMBER OF UPDATED ROWS. STRICTILY ONE! NEVER MORE. NO DUPLICATE TOKENS
  await user_funcs.logout(req, function (result) {
    try {
      console.log(result);
      switch (result) {
        case 0:
          return res.status(401).send("Unauthorized");
        case 1:
          return res.status(200).send("OK");
        default:
          throw 0;
      }
    } catch (err) {
      return res.status(500).send("Internal Server Error");
    }
  });
};

exports.getuserimage = async function (req, res) {
  // sanity checks
  const id = req.params.id;

  try {
    await user_funcs.getuserphoto(id, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else return res.status(200).sendFile(value.file);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
};

exports.putuserimage = async function (req, res) {
  if (!req.params.id) {
    res.status(500).send("Internal Server Error");
    return;
  }
  const id = req.params.id;
  const token = req.get("X-Authorization");
  const MimeType = req.get("Content-Type");
  if (!passwords.isvalidmimetype(MimeType)) {
    res.status(400).send();
    return;
  }
  if (!token) {
    res.status(404).send();
    return;
  }
  try {
    await user_funcs.putuserimage(id, token, MimeType, req.body, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else return res.status(200).sendFile(value.file);
    });
  } catch (err) {
    return res.status(500).send();
  }
};

exports.deleteimage = async function (req, res) {
  if (!req.params.id) {
    res.status(500).send("Internal Server Error");
    return;
  }
  const id = req.params.id;
  const token = req.get("X-Authorization");

  if (!token) {
    res.status(401).send();
    return;
  }
  try {
    await user_funcs.deleteuserimage(id, token, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else return res.status(200).send();
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
};
