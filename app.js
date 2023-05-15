const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializeServerDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running http://localhost:3000");
    });
  } catch (e) {
    console.log(`Db Error ${e.message}`);
    process.exit(1);
  }
};
initializeServerDb();
///
const convertStateObjectsToResponseObjects = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictObjectsToResponseObjects = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "My_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/login", async (request, response) => {
  let { username, password } = request.body;
  let checkTheUsername = `
            SELECT *
            FROM user
            WHERE username = '${username}';`;
  let userData = await db.get(checkTheUsername);
  if (userData === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, userData.password);
    if (isPasswordMatched === true) {
      const playload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//
app.get("/states/", authenticateToken, async (request, response) => {
  const getstatesQuery = `
  SELECT * FROM state;`;
  const statesArray = await db.all(getstatesQuery);
  response.send(
    statesArray.map((eachArray) =>
      convertStateObjectsToResponseObjects(eachArray)
    )
  );
});
////
app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
SELECT * FROM state WHERE state_id=${stateId}:`;
  const state = await db.get(getStateQuery);
  response.send(convertStateObjectsToResponseObjects(state));
});
///
app.get(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
SELECT * FROM district WHERE district_id=${districtId}:`;
    const district = await db.get(getStateQuery);
    response.send(convertDistrictObjectsToResponseObjects(district));
  }
);
///
app.post("/districts/", authenticateToken, async (request, response) => {
  const {
    stateId,
    districtName,
    cases,
    cured,
    active,
    deaths,
  } = request.params;
  const postDistrictQuery = `
INSERT INTO district (state_id,district_name,cases,cured,active,deaths)
VALUES (
    ${stateId},
    '${districtName}',
    ${cases},
    ${cured},
    ${active},
    ${deaths}
)`;
  const district = await db.run(getStateQuery);
  response.send("District Successfully Added");
});

app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `
    DELETE FROM district WHERE district_id=${districtId}`;
    await db.run(deleteQuery);
    response.send("District Removed");
  }
);
///
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
    UPDATE district
    SET 
    district_name='${districtName}
    state_id='${stateId}',
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    WHERE district_id=${districtId}`;
    await db.run(updateDistrictQuery);
    response.send("District Deatils Updated");
  }
);
///
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateQuery = `
SELECT SUM(cases),
Sum(cured),
SUM(active),
SUM(deaths) FROM district WHERE state_id=${stateId}:`;
    const state = await db.get(getStateQuery);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  }
);
module.exports = app;
