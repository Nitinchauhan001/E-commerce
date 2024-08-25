import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';


const app = express();
const port = 3000;

const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'bassHarbour',
  password: 'nitin123',
  port: 5432,
});
db.connect();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get('/', (req, res) => {
  res.render('login.ejs');
});

app.get("/buy", (req,res) =>{
  res.render("buy.ejs");
});

app.get("/about", (req,res) =>{
  res.render("about.ejs");
});

app.get("/register", (req,res) => {
  res.render("register.ejs");
});

app.get("/done",(req,res) => {
  res.render("login.ejs");
})

app.get("/payment",(req,res) => {
  res.render('payment.ejs')
})

app.get("/reset",(req,res) => {
  res.render("reset.ejs");
})

app.post('/register', async (req, res) => {
  const { name ,referral_code, email, account_no, ifsc_code ,password, contact_no } = req.body;

  try {
    // Insert data into user_table
    const userResult = await db.query(
      'INSERT INTO userinfo (user_name, referral_code, email, account_number, ifsc_code, password, contact_no) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, referral_code, email, account_no, ifsc_code, password, contact_no]
    );

    const newUser = userResult.rows[0];

    // Insert data into referral_info with default values
    await db.query(
      'INSERT INTO referral_info (user_id, total_referrals, paid_referrals) VALUES ($1, 0, 0)',
      [newUser.user_id]
    );

    // Check if there is an older user with the given referral_code
    const olderUserResult = await db.query(
      'SELECT user_id FROM userinfo WHERE user_id = $1',
      [referral_code]
    );

    if (olderUserResult.rows.length > 0) {
      // Update the total_referrals for the older user
      const olderUserId = olderUserResult.rows[0].user_id;
      await db.query(
        'UPDATE referral_info SET total_referrals = total_referrals + 1 WHERE user_id = $1',
        [olderUserId]
      );
    }
    res.render("home.ejs",{username : newUser.user_name, userid : newUser.user_id});
  } catch (error) {
    console.error('Error inserting data into user_table:', error);
    res.redirect('/register?error=true');
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM userinfo WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedPassword = user.password;
      const user_id = user.user_id;
      const user_name = user.user_name;

      if (password === storedPassword) {
        const totalresult = await db.query(
          'SELECT * FROM referral_info WHERE user_id = $1',
          [user_id]
        );
        
        const referrals = totalresult.rows[0];
        const total_referrals = referrals.total_referrals;
        const paid_referrals = referrals.paid_referrals;
       
        res.render("home.ejs",{ username : user_name, userid : user_id, totalrefferals : total_referrals, paidreferrals : paid_referrals });
      } else {
        res.send("Incorrect Password");
      }
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/reset", async (req, res) => {
  const email = req.body.email;
  const newpassword = req.body.password;

  try {
    const result = await db.query("SELECT * FROM userinfo WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      
      await db.query(
        'UPDATE userinfo SET password = $1 WHERE email = $2',
        [newpassword,email]
      );
      res.render("login.ejs");
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
