const petcontroller = require('../controllers/petition.controller');


module.exports = function(app) { 
    app.route(app.rootUrl + '/petitions')
    .get(petcontroller.get_pets)
    .post(petcontroller.postpetition);



    app.route(app.rootUrl + "/petitions/categories")
    .get(petcontroller.getAllCategory);


    
    app.route(app.rootUrl + '/petitions/:id')
    .get(petcontroller.getpetbyid)
    .delete(petcontroller.deletepetition)
    .patch(petcontroller.patchpetition);



    app.route(app.rootUrl + "/petitions/:id/photo")
    .get(petcontroller.gethero)
    .put(petcontroller.posthero);





}