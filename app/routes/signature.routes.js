const sigfuncs = require("../controllers/signature.controller");


module.exports = function (app) {
    app.route(app.rootUrl + '/petitions/:id/signatures')
        .post(sigfuncs.sign)
        .get(sigfuncs.getsignature)
        .delete(sigfuncs.deletesig);


    }
