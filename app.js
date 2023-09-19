const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const path = require("path");
const dbPath = path.join(__dirname, "/twitterClone.db");
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

let dbObj = null;

const connectDbAndStartServer = async () => {
  try {
    dbObj = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is listening on http://localhost:3000/");
      //console.log(dBConnObj);
    });
  } catch (e) {
    console.log(`Error message :${e.message}`);
    process.exit(1);
  }
};
connectDbAndStartServer();

const camelToSnakeCase = (obj) => {
  return {
    
    
    username: obj.username,
      tweet: obj.tweet,
    dateTime: obj.date_time

  };
};

const camelToSnakeCase1 = (obj) => {
    console.log(obj.name);
    
  return {  
    name: obj.name

  };
};

//API 1
app.post("/register/",async(request,response)=>{
    const {username,name,password,gender,location} = request.body;
    const hashedPassword = await bcrypt.hash(password,10);
   const selectUserQuery = `SELECT *FROM user
    WHERE username = '${username}';`;
    const dbResult = await dbObj.get(selectUserQuery);
    //console.log(dbResult);
    if(dbResult===undefined){
        const addUserQuery = `INSERT INTO 
        user(username,name,password,gender) 
        VALUES('${username}','${name}','${hashedPassword}','${gender}');`;
        if(password.length<=5){
              response.status(400);
              response.send("Password is too short");         
        }
        else{
                 await dbObj.run(addUserQuery);
                 response.status(200);
                response.send("User created successfully");            
        }
   
    }
    else{
        response.status(400);
        response.send("User already exists");
    }
});

//API 2
app.post("/login/",async(request,response)=>{
     const {username,password} = request.body;
        const selectUserQuery = `SELECT *FROM user
    WHERE username = '${username}';`;
    const dbResult = await dbObj.get(selectUserQuery);
     if(dbResult===undefined){
         response.status(400);
         response.send("Invalid user");
     }
     
     else{
         const isPasswordSame = await bcrypt.compare(password,dbResult.password);
         console.log(dbResult.user_id);
         
         if(isPasswordSame){
             const payload = {
                 username : username
             };
             const userId = dbResult.user_id;
             console.log(userId);
             
         const jwtToken = jwt.sign(payload,"My_Token");  
         console.log(jwtToken);
                 
         response.send({jwtToken});
         }
         else{
         response.status(400);
         response.send("Invalid password");
         }
     }

});

//Authenticate Token Middleware
const authenticateToken = (request,response,next) =>{
    let jwtToken;
    const authHeader = request.headers.authorization;
    //console.log(authHeader);
    //jwtToken = authHeader.split(" ")[1];
    //console.log(jwtToken);
    
    if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if(jwtToken===undefined){
         response.status(401);
    response.send("Invalid JWT Token");
  }
  else{
      jwt.verify(jwtToken,"My_Token",async(error,payload)=>{
        if(error){
        response.status(401);
        response.send("Invalid JWT Token"); 
        }
        else{
            request.username = payload.username;            
            next();
        }
      });
  }
}

//API 3
app.get("/user/tweets/feed/",authenticateToken,async(request,response)=>{
    const {username} = request;
    console.log(username);
    const userIdQuery = `SELECT user_id FROM
    user WHERE username = '${username}'`;
    const {user_id} = await dbObj.get(userIdQuery);
    console.log(user_id);
    const userFeedQuery = `
    SELECT follower.following_user_id, user.username,
    tweet.tweet, tweet.date_time
    FROM user
    INNER JOIN tweet ON user.user_id = tweet.user_id 
    INNER JOIN follower ON user.user_id = follower.following_user_id
    WHERE follower.follower_user_id = ${user_id}
    order by tweet.date_time desc
    LIMIT 4;
    `;

    const userFeed = await dbObj.all(userFeedQuery);
    response.send(userFeed.map((obj) => camelToSnakeCase(obj)));
  
});

//API 4
app.get("/user/following/",authenticateToken,async(request,response)=>{
        const {username} = request;
    console.log(username);
    const userIdQuery = `SELECT user_id FROM
    user WHERE username = '${username}'`;
    const {user_id} = await dbObj.get(userIdQuery);
    //console.log(user_id); 
    const userFollowingQuery = `
    SELECT user.name
    FROM user
    INNER JOIN follower ON user.user_id = follower.following_user_id
    WHERE follower.follower_user_id = ${user_id};
    `;

    const userFollowing = await dbObj.all(userFollowingQuery);
    response.send(userFollowing.map((obj) => camelToSnakeCase1(obj)));

});

//API 5
app.get("/user/followers/",authenticateToken,async(request,response)=>{
    const {username} = request;
    console.log(username);
    const userIdQuery = `SELECT user_id FROM
    user WHERE username = '${username}'`;
    const {user_id} = await dbObj.get(userIdQuery);
    //console.log(user_id); 
    const userFollowersQuery = `
    SELECT user.name
    FROM user
    INNER JOIN follower ON user.user_id = follower.follower_user_id 
    WHERE follower.following_user_id = ${user_id};
    `;

    const userFollowers = await dbObj.all(userFollowersQuery);
    response.send(userFollowers.map((obj) => camelToSnakeCase1(obj)));

});
module.exports = app;
