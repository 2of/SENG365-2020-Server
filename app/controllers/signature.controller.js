const sigfuncs = require("../models/signature.model");

exports.sign = async function (req, res) {
  const token = req.get("X-Authorization");
  const id = req.params.id;
  console.log(req.params.id, token);
  if (true) {
    //Sanity Checks shall go in this space with a throw
  }

  await sigfuncs.sign_petition(id, token, function (result) {
    try {
      console.log(result);
      switch (result) {
        case 401:
          res.status(401);
          break;
        case 403:
          res.status(403);
          break;
        case 404:
          res.status(404);
          break;
        case 500:
          throw 0;
        default:
          res.status(201);
      }
      res.send();
    } catch (err) {
      res.status(500);
    }
  });
};

exports.getsignature = async function (req, res) {
  const id = req.params.id;
  try {
    await sigfuncs.getsignature(id, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else return res.status(200).send(value);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
};

exports.deletesig = async function (req, res) {
  if (!req.get("X-Authorization")) {
    return res.status(401).send();
  }
  try {
    var token = req.get("X-Authorization");
    const id = req.params.id;

    await sigfuncs.deletesignature(token, id, function (value) {
      if (Number.isInteger(value)) {
        return res.status(value).send();
      } else return res.status(201).send(value);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
};

exports.deletesig2 = async function (req, res) {
  const token = req.get("X-Authorization");
  const id = req.params.id;
  console.log(req.params.id, token);
  if (true) {
    //Sanity Checks shall go in this space with a throw
  }

  await sigfuncs.deletesignature(id, token, function (result) {
    try {
      console.log(result);
      switch (result) {
        case 401:
          res.status(401).send("Unauthorized");
          break;
        case 403:
          res.status(403).send("Forbidden");
          break;
        case 404:
          res.status(404).send("Not Found");
          break;
        case 500:
          throw 0;
        default:
          res.status(201).send("Ok");
      }
    } catch (err) {
      res.status(500).send("Internal Server Error");
    }
  });
};
