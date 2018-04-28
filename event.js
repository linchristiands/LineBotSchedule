var LineEvent = function (data) 
{
    this.data = data;
}

LineEvent.prototype.changeName=function(name)
{
    this.data.name=name;
}

LineEvent.findById = function (id, callback) {
    db.get('users', {id: id}).run(function (err, data) {
    if (err) return callback(err);
    callback(null, new User(data));
    });
    }
    
module.exports = User;
    