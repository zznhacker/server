var redis = require('redis');
var http = require('http');
var httpUpload = require('http');
var express    = require('express')
var bodyParser = require('body-parser')
var app = express()
app.use(bodyParser.json({ limit: '100mb' }))

const crypto = require('crypto');
var url = require("url");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var NodeRSA = require('node-rsa');
var urlMongo = 'mongodb://localhost:27017/test';
var fs = require('fs');
var querystring = require("querystring");
http.createServer(function (req, res) {
  if(req.method=="POST")
  {	
   
    // 设置接收数据编码格式为 UTF-8
    req.setEncoding('utf-8');
	
    var postData = ""; //POST & GET ： name=zzl&email=zzl@sina.com
    // 数据块接收中
    req.addListener("data", function (postDataChunk) {
        postData += postDataChunk;
    });
    // 数据接收完毕，执行回调函数
    req.addListener("end", function () {
	
        var params = querystring.parse(postData);//GET & POST  ////解释表单数据部分{name="zzl",email="zzl@sina.com"}
        var status = params["status"];
	var jsonObj;
	if (typeof status == 'undefined')
	{
		for(var key in params)
        	{
			console.log(key);
			var keyTrans = JSON.parse(key);
                	if(keyTrans["status"]!='undefined')
			{
				jsonObj = keyTrans;
				status = keyTrans["status"];	
			}
        	}
		console.log(jsonObj["file"]);	
	}
        console.log(status);
	if(status == "login")
        {
          res.writeHead(200, {
              "Content-Type": "text/plain;charset=utf-8"
          });
          var password = params["password"];
          var username = params["username"];
          MongoClient.connect(urlMongo, function(err, db) {
          assert.equal(null, err);
          var cursor =db.collection('Users').find({"username":params["username"],"password":password});
          cursor.each(function(err, doc) {
              assert.equal(err, null);
              if (doc != null ) {
                  console.log(doc);
                  var json = '{"status":"success"}';
                  console.log("login success!");
                  res.write(json, function(err) { res.end(); });
              }
              else{
                var json = '{"status":"failed"}';
                console.log("login failed!");
                res.write(json, function(err) { res.end(); });

              }
            });
          });

        }
        else if (status == "register")
        {
          var decrypted = RSALoading(params["info"]);

          res.writeHead(200, {
              "Content-Type": "text/plain;charset=utf-8"
          });
          MongoClient.connect(urlMongo, function(err, db) {
            assert.equal(null, err);
            insertDocument(db,decrypted["username"],decrypted["password"],decrypted["salt"],"Users",function() {
                db.close();
            });
          });
          res.end('{"status":"success"}');
        }

        else if(status == "itemInput")
        {
          var decrypted = RSALoading(params["info"]);
          console.log("in itemInput status");
          res.writeHead(200, {
              "Content-Type": "text/plain;charset=utf-8"
          });
          MongoClient.connect(urlMongo, function(err, db) {
            assert.equal(null, err);
            insertItem(db,params["username"],decrypted["itemName"],decrypted["itemType"],decrypted["itemDate"],"ItemList",function() {
                db.close();
            });
          });
          res.end('{"status":"success"}');
          
        }
        else if(status == "viewItem")
        {
          res.writeHead(200, {
              "Content-Type": "text/plain;charset=utf-8"
          });
          var json = {
            items:[],
            "status":"success"
          };
          MongoClient.connect(urlMongo, function(err, db) {
          assert.equal(null, err);
          var cursor =db.collection('ItemList').find().toArray(function(e, d) {
            db.close();
            for(var i=0;i<d.length;i++)
            {
              json.items.push({
                "itemDate":d[i].item_date,
                "itemName":d[i].item_name,
                "itemType":d[i].item_type,
                
              });
            }
            res.write(JSON.stringify(json), function(err) { res.end(); });
            
          });

          });
        }
      });
  }
  else if(req.method == "GET")
  {
    var params = url.parse(req.url, true).query;//解释url参数部分name=zzl&email=zzl@sina.com
    var client = redis.createClient();
    client.lpush("topnews", params.user);
    console.log(params["user"]);
    res.writeHead(200, {
        'Content-Type': 'text/plain;charset=utf-8'
    });
    client.lpop("topnews", function (i, o) {
        console.log(o);//回调，所以info可能没法得到o的值，就被res.write输出了
    })
    client.quit();
  }
}).listen(8080, "10.135.63.17");


httpUpload.createServer(function (req, res) {
  if(req.method=="POST")
  { 
	console("uploading mode");   
    // 设置接收数据编码格式为 UTF-8
    req.setEncoding('utf-8');
    var stream = fs.createWriteStream("test.jpg");
  
    var postData = ""; //POST & GET ： name=zzl&email=zzl@sina.com
    // 数据块接收中
    req.addListener("data", function (postDataChunk) {
        postData += postDataChunk;
    });
    // 数据接收完毕，执行回调函数
    req.addListener("end", function () {
  stream.once('open', function(fd) {
    
  stream.write(postData);
    stream.end();
  });
});
  }
}).listen(8081, "10.135.63.17");

var insertDocument = function(db,username,password,salt,dbname,callback) {
   db.collection(dbname).insertOne( {
      "username" : username,
      "password" : password,
      "salt"     : salt
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the User collection.");
    callback();
  });
};

var insertItem = function(db,username,itemname,itemtype,itemdate,dbname,callback) {
   db.collection(dbname).insertOne( {
      "username" : username,
      "item_name" : itemname,
      "item_type"     : itemtype,
      "item_date"     : itemdate
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a item into the item collection.");
    callback();
  });
};

var findUsers = function(db,user,password,callback) {
   
};

function RSALoading(encrypted){

var pri = "-----BEGIN PRIVATE KEY-----\n"+
"MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCz0fgoyn6N/WUd\n"+
"1/nPsEFnDn0pixt30VQrI1Vik1lokoM4Qe4WWQYKzjVO7/rafQo0a51FUTKjr0C/\n"+
"LX0bfbxXqxkyvGmCt2GAKVeLtHVTERrfk7wbK5iOby3VuYcLjEFYdmK0cTlRpPDu\n"+
"DpbsY5GnZCVOfuo+xvAwYZKXrdeV6FsxvUG4mYtkkm5K0RbVwkeZq1M8wcw6iQ1K\n"+
"QrojSRrjk654b1Aw9qbsljtf2DtjAu61KAsHhWjSfVVcXq3uyoOb8IxR7KzvlVj4\n"+
"bwEEa9JoURk1KtvSW2V6m48NVSaAFjkY5M3nfER0oXj8tEjyI0+EaX3RKukO6L1a\n"+
"Yh/ULbt9AgMBAAECggEAe9/KX3dXhUMpVEzDN9LIy1DM4kCFFJ5sqCb4HCc7sXE0\n"+
"2h15AYYkRm9Vg+KH4dm/nOsBdY4BH4eMR+bzR2vvwkkI2821tanUjfBs8b3IEQg4\n"+
"hgqEzAbVWlG2toPPRyJApcswJfPVs6u3mZcNWx0garrvhEqj3ck4D2w4Cytj100I\n"+
"UlGvW5nWbgVAYTwYDQgViAgcpuJwzwsr9EX3YZCvNRuylQRV4GDqwUFoMDGQs73q\n"+
"G76NEwwTDV/FJYnLwDtl6AykiffLwM6l0Rniq+hGDRon8dT9QD9rLzN8K1dfil4U\n"+
"6d+ac5t+bVVpT/UVWmOKDkrrTehSL9s9PdA256LZgQKBgQDpgdha2de04QEJHMLQ\n"+
"NCK5aSucbQaYjaZv63PeWGHoGf9rt93wvhLecAwFnWTJij1UHIylwL0N8n4bk6xr\n"+
"lpibJX0OHRgTNNOwcqJYC1wmmlkgFqsZ/biyQ1ebvULbfHc5yYfdNgpHHi2QDc6G\n"+
"juAPYU1dVJpS9BcyYATUSAB14QKBgQDFJDumH9FecGdnZmHq+BtezqW8Vw9HMhZ/\n"+
"o1oUT9DtLd8WsfHH8DBjl7p2WOjrE9NDwDAnK9eFzA+cMQDGayOIa9JfM/jruDbA\n"+
"479tPJzS4fG1BKMLGgruJnAKhccwkDhOLewGPUVos44wOYAQstAYH1EIoG0ierUp\n"+
"goBss/qBHQKBgGSt4HwjixbpIMouBW1B3Wr2BqC2fW6PPKDq8xV+JBCwDOoD6ASh\n"+
"337a7sQI/ejL2u+GM7pP5PO7h1YakO/+iaPzQP0x3CyDzXY5pvexRjU6vYzRWUqm\n"+
"k9kAoih7LPV3r+xRkWv2ne3V/C0tVsu7lK3s9S91h+iWZ94Hem2Q8enhAoGAXkkl\n"+
"/h3ZlMFNszZUPnzLGlzbB2jb9cEO4ZzOyEgkNEtsFv6kFGvbuMYod9GuFEA3GoAg\n"+
"h5uASI2AKcOGC1/SbryisMW6l4JTLY2/UA9dMb6+S0UcdYLPF3dqvp2c1q0jQMDV\n"+
"0WYcfCbkKkxV46ahv+e6adXQXF0zp9aydUre1EECgYBdT8aX2R92tq9WT200moKp\n"+
"jCP3AnH6bbmzla8FLv5ee81qJEV1we0m6o9NxqyuLY3WeUUtqvRhzPrEp2+WmktO\n"+
"agU6aM540KFcnLN0wyDm/BPEp++B6Vn7nlhjbruVgYZSiF0izz8nXZ4yJe5P4gWH\n"+
"lbyim/2+XZ+U2JNzPzpj8g==\n"+
"-----END PRIVATE KEY-----";
  var key = new NodeRSA({b: 2048});
  key.importKey(pri, 'pkcs8');
  console.log(encrypted);
  var decrypted = key.decrypt(encrypted,'json');

  console.log('decrypted',decrypted);
  return decrypted;


}

var AESCrypt = {};

AESCrypt.decrypt = function(cryptkey, iv, encryptdata) {
    encryptdata = new Buffer(encryptdata, 'base64').toString('binary');
    var decipher = crypto.createDecipheriv('aes-128-cbc', cryptkey, iv);
    var decoded  = decipher.update(encryptdata, 'binary', 'utf8');

    decoded += decipher.final('utf8');
    return decoded;
}

AESCrypt.encrypt = function(cryptkey, iv, cleardata) {
    var encipher = crypto.createCipheriv('aes-128-cbc', cryptkey, iv);
    var encryptdata  =   encipher.update(cleardata, 'utf8', 'binary');
    encryptdata += encipher.final('binary');
    var encode_encryptdata = new Buffer(encryptdata, 'binary').toString('base64');
    return encode_encryptdata;
}




//表单接收完成后，再处理redis部分
function PushToRedis(info) {
    var client = redis.createClient();
    client.lpush("topnews", info);
    console.log("PushToRedis:" + info);
    client.lpop("topnews", function (i, o) {
        console.log(o);//回调，所以info可能没法得到o的值，就被res.write输出了
    })
    client.quit();
}


var removeAll = function(db, callback) {
   db.collection('Users').deleteMany( {}, function(err, results) {
      console.log(results);
      callback();
   });
};


