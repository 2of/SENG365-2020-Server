const uauth = require("../controllers/userauth.controller");


module.exports = function (app) {
    app.route(app.rootUrl + '/users/register')
        .post(uauth.create_new);

        app.route(app.rootUrl + "/users/:id")
        .get(uauth.getInfoSingleUser)
        .patch(uauth.update);

        app.route(app.rootUrl + "/users/:id/photo")
        .get(uauth.getuserimage)
        .put(uauth.putuserimage)
        .delete(uauth.deleteimage);

        app.route(app.rootUrl + "/users/login")
        .post(uauth.login);


        app.route(app.rootUrl + "/users/logout")
        .post(uauth.logout);



    }
