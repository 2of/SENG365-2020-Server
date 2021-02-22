const crypto = require('crypto');
const db = require('../../config/db');
const path = require('path');

// repurposed as the gerneal toolbelt //

exports.photo_dir = ('./storage/photos/');

exports.is_valid_image = function(type){
    const refs = ['image/png', 'image/jpeg', 'image/jpg','image/gif']
    return( refs.includes(type))
}
 
exports.filename_to_mime = function(filename) {
    const refs = {'.jpg':'image/jpeg','.png':'image/png','.gif':'image/gif'};
    let a  = refs[path.extname(filename)];
    return (a ? a : false);
};


exports.image_types = {"image/jpeg":".jpg",
                "image/png":".png",
                "image/gif":".gif"}

exports.hash = function(str_in) { 
    return crypto.createHash('sha256').update(str_in).digest('hex');
}

exports.isvalidmimetype = function(string_rep) { 
    const refs = ['image/jpeg','image/png','image/gif']
    return(refs.includes(string_rep));

}
exports.get_uid_from_token = async function(token) { 
    if (token == null) { 
        // ^^ FURTHER SAFETY CHECKING HERE TO DO
        return [];
    }
    try { 
    //return the UserID if the token exists,
    const conn = await db.getPool().getConnection();
    const [ uid ] = await conn.query('SELECT user_id as userId,auth_token AS token FROM User WHERE auth_token = ?',token);
    conn.release();
    return (uid.length == 0 ? [] : uid);
 } catch (err) {
     console.log(err);
     //Default to return nothing.
    return [];
    }
}

exports.valid_email = function(email) { 
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}




exports.confirm_password = async function(id, passcode) {
    // returns true if the associated password is indeed the password in the db
    try { 
    const conn = await db.getPool().getConnection();
    const hashpass = this.hash(passcode);
    const [result] = await conn.query('SELECT * FROM User WHERE user_id = ? AND password = ?', [id,this.hash(passcode)]);
    return ((result.length != 0));
    } catch (err) { 
        return false;
    }
}

exports.compare_dates = function (base_date, comparison_date) { 
    return true;
}

exports.generate_filename = function(filetype,uid,petid) {

    let extension  = filetype.split('.').pop();
  //  const time  = new Date().toISOString().slice(0, 19).replace(':', '');
    return('pet' + petid + '_owner' + uid +  this.image_types[extension]);
}

exports.isdatefuture = function (date) { 
    let now = new Date();
    let comp = new Date(date);
    return (now < comp)
}

exports.isfirstdateolder = function(date1, date2) { 
    let a = new Date(date1);
    let b = new Date(date2);
    return (a<b)
}

exports.close_nicely = async function(connection_obj, statcode, finalise) {
    // a little cleanup code!
    try { 
        let a = await connection_obj.release();
    }
    catch (err) { 
        // Using literal comparisons to undefined yields a freeze after precisely 9 queries. 
        // try catch solves this
        console.log("ERROR RELEASING DB CONNECTION ${err}");

    } finally { 
        return finalise(statcode)
    }
}

exports.current_timedate = function() { 
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}


exports.generate_user_filename_photo = function(user,file_type) { 
    let extension = file_type.split('.').pop();
    return ('user'+ user + 'idphoto' + this.image_types[extension] );} 

exports.generate_token = function() {
    return  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // const token = (Math.floor(Math.random() * 100000000));
    // return (token);
}
