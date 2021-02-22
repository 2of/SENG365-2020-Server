const petfuncs = require('../models/petition.model');
const passwords = require('../models/passwords');
const fs = require('fs');




exports.getpetbyid = async function (req, res) { 
    try 
    { 

        console.log("HELLO");
        // if (!req.params.id || !Number.isInteger(req.params.id)) { 
        //     return (res.status(404));
        // }
        if (isNaN(req.params.id) || !req.params.id) { 
            console.log("Using 404 for illformed request because we require ints for the petId")
            return res.status(404).send();
        }

        const id = req.params.id;
        const result = await petfuncs.getpetbyID(id);
        if (result == 0) { 
            return res.status(404).send('Not Found');
        } else { 
        return res.status( 200 ).send( result );
        }   
    } catch (err) { 
        console.log(err);
        return res.status(500).send('Internal Server Error');
    } 



}

exports.patchpetition = async function (req, res) { 
    // sanity checks
    let body = Object.assign(req.body);
    const id = req.params.id;
    const token = req.get('X-Authorization');
    console.log(token)
    if (!token || token == '') {
        res.status(401).send();
        return;
    }

    try { 
        await petfuncs.patchpetition(token,body,id, function(result) { 
            console.log(result);
            if (Number.isInteger(result)) { 
               return res.status(result).send();
            }  return res.status(200).send(result);
        })
    } catch (err) { 
        console.log(err);
        return res.status(500).send();
    }

}



exports.deletepetition = async function (req, res) { 

    let token = req.get('X-Authorization');
    let id = req.params.id; 
    console.log(id, req.params)
    await petfuncs.deletepetition(token, id, function(result) { 
        try {
            switch (result) { 
                case 401:
                    res.status(401).send();
                case 403:
                    res.status(403).send();
                case 404:
                    res.status(404).send();
                case 500:
                    throw(0);
                default:
                    res.status(200).send(result);
            }
        } catch (err) { 
            console.log(err);
            res.status(500).send();
        }
  

    });
}


exports.postpetition = async function (req, res) { 
    if (!req.body.title || !req.body.categoryId || !req.body.closingDate ) {
        return res.status(400).send();
      }
    
    if (!req.get('X-Authorization')) { 
        return res.status(401).send();
    }
    if(!passwords.isdatefuture(req.body.closingDate))   { return res.status(400).send()}

    try { 
        var body = req.body;
        var token = req.get('X-Authorization');

        await petfuncs.postPetition(token,req.body, function(value) { 
            if (Number.isInteger(value)) {
                return res.status(value).send();
              } else return res.status(201).send(value);

        })

    } catch (err) { 
        console.log(err);
    }

   


}









exports.getAllCategory = async function (req, res) { 
    petfuncs.getCategory(function (result) {
        try { 
            return res.status(200).send(result);
        } catch (a) {
            console.log("ERROR IS CAUGHT");
            console.log(a);
            return res.status(500).send("Internal Server Error");
        }
    });
}



exports.gethero = async function (req, res) {
    // sanity checks
    const id = req.params.id;
  
    try {
      await petfuncs.getheroimage(id, function (value) {
        if (Number.isInteger(value)) {
          return res.status(value).send();
        } else return res.status(200).sendFile(value.file);
      });
    } catch (err) {
      console.log(err);
      return res.status(500).send();
    }
  };
  


exports.posthero = async function (req, res) { 
    console.log(req.params.id);
    console.log(req.body);
    if (!req.get('X-Authorization')) {return res.status(401).send()};
    const id = req.params.id; 
    const token = req.get('X-Authorization');
    const type = req.get('Content-Type');
    if (!(passwords.isvalidmimetype(type))) { res.status(400).send(); return;};
    if (!(token)) { res.status(401).send(); return;};


    try {   
        await petfuncs.putheroimage(id,token,type,req.body, function (value) {
            if (Number.isInteger(value)) {
              return res.status(value).send();
            } else return res.status(200).sendFile(value.file);
          });

    } catch (err) { 
        console.log(err);
        return res.status(500).send();
    }


    return res.status(500).send();
}

exports.get_pets = async function (req, res) { 
   let params = req.query;
   try { 
       await petfuncs.getpetition(params,function(value) {
        if (Number.isInteger(value)) {
            return res.status(value).send();
          } else return res.status(200).send(value);
        });
    } catch (err) { 
        console.log(err);
        return res.status(500).send();
    }
}