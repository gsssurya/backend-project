const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();                                // Users administrator 
app.use(express.json());                              // username = dosenpsb
app.use(cookieParser());                              // password = kasisayaseratuspak


/* Connect Database start */
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pos'
});
/* Connect Database end */

/* AuthMiddleware start */
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) return res.status(403).json({
    message : 'Anda belum login'
  });
  
  jwt.verify(token, 'shhhhh', (err, decoded) => {
    if (err) return res.status(401).json({ 
      message: 'Token invalid' 
    });

    req.user = decoded;
    next();
  });
};
/* AuthMiddleware end */

/* Sign-up start */
app.post('/signup', (req,res) => {
  try {
    const token = req.cookies.token;
    if(token) return res.status(403).json({
      message: 'Silahkan signout terlebih dahulu'
    });

    const {
      name,
      username,
      password
    } = req.body;

    if(!name || !username || !password) return res.status(403).json({
      message: 'Tolong lengkapi name, username, dan password!'
    });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    db.query(`INSERT INTO users
        (name, username, password, role) VALUES (
          '${name}', 
          '${username}', 
          '${hash}', 
          'member'
        )
      `,
      (err, data) => {

        if(err) throw err;

        res.status(200).json({
          message: 'Signup Berhasil'
        });
      }
    )
  } catch (e) {
    res.status(500).json({
      message: 'Gagal'
    });
  }
});
/* Sign-up end */

/* Sign-in start */
app.post('/signin', (req,res) => {
  if (req.cookies.token) return res.status(403).json({
    message: 'Anda telah login'
  });
  
  try {
    const { username, password } = req.body;

    if(!username || !password) return res.status(404).json({ 
      message: 'Tolong lengkapi username dan password!' 
    });

    db.query(`
      SELECT * FROM users
      WHERE username = '${username}'
      `, (err, data) => {

        if(err) throw err;
        
        if(!data[0]) return res.status(404).json({ 
          message: 'User tidak ditemukan' 
        });

        const hash = data[0].password;
        const isPasswordTrue = bcrypt.compareSync(password, hash);

        if (isPasswordTrue) {
          var token = jwt.sign({
            name: data[0].name,
            username: data[0].username,
            role: data[0].role
            }, 'shhhhh'
          );

          res.cookie('token', token, {
            httpOnly: true,
            //secure: true,
            maxAge: 24 * 60 * 60 * 1000,
            //signed: true,
          });

          res.status(200).json({
            message: `Signin Berhasil, Hallo ${data[0].name}`
          });

        } else {
          res.status(200).json({
            message: 'Password Salah'
          });
        }
      }
    )
  } catch (e) {
    res.status(500).json({
      message: 'Gagal'
    });
  }
});
/* Sign-in end */

/* Sign-out start */
app.get('/signout', (req, res) => {
  const token = req.cookies.token;
  if(!token) return res.status(403).json({
    message: 'Anda belum signin'
  });
  res.clearCookie('token');
  res.status(200).json({ 
    message: 'Signout Berhasil' 
  });
});
/* Sign-out end */

/* GET all start */
app.get('/product', authMiddleware, (req,res) => {
  try {
      db.query(`SELECT * FROM products
        `, (err,data) => {
          if(err) throw err;
          res.status(200).json(data);
        }
      )
  } catch (e) {
    res.status(500).json({
      message: 'Gagal'
    });
  }
});
/* Get all end */

/* GET with id start */
app.get('/product/:id', authMiddleware, (req,res) => {
    try {
      const { id } = req.params;
      db.query(`SELECT * FROM products
        WHERE id = ${id}
        `, (err,data) => {
          if(err) throw err;
          res.status(200).json(data);
        }
      )
    } catch (e) {
      res.status(500).json({ 
        message: 'Gagal' 
      });
    }
});
/* GET with id end */

/* POST start */
app.post('/product', authMiddleware, (req, res) => {
  if (req.user.role != 'administrator') return res.status(403).json({ 
    message: 'Akses Anda dibatasi' 
  })
  try {
    const { name, price } = req.body;

    if(!name || !price) return res.status(403).json({
      message: 'Tolong lengkapi name dan price!'
    });

    db.query(`
      INSERT INTO products
      (name, price) VALUES
      ('${name}', ${price})
      `, (err, data) => {
        if(err) throw err;
        res.status(200).json({ 
          message : 'Berhasil' 
        })
      }
    )
  } catch (e) {
    res.status(500).json({ 
      message: 'Gagal' 
    })
  }

});
/* POST end */

/* PUT start */
app.put('/product/:id', authMiddleware, (req, res) => {
  if (req.user.role != 'administrator') return res.status(403).json({ 
    message: 'Akses Anda dibatasi' 
  })
  try {
    const { id } = req.params;
    const { name, price } = req.body;
    if(!id || !name || !price) return res.status(403).json({
      message: 'Tolong lengkapi name dan price yang baru!'
    });
    db.query(`
      UPDATE products
      SET
      name = '${name}',
      price = ${price}
      WHERE id = ${id}
      `, (err, data) => {
        if(err) throw err;
        res.status(200).json({ 
          message : 'Berhasil' 
        });
      }
    )
  } catch (e) {
    res.status(500).json({ 
      message : 'Gagal' 
    });
  }
});
/* PUT end */

/* DELETE start */
app.delete('/product/:id', authMiddleware, (req, res) => {
  if (req.user.role != 'administrator') return res.status(403).json({ 
    message: 'Akses Anda dibatasi' 
  })
  try{
    const { id } = req.params;

    db.query(`
      DELETE FROM products
      WHERE id = ${id}
      `, (err, data) => {
      if (err) throw err;
      res.status(200).json({
        message: 'Berhasil'
      });
      }
    )
  } catch (e){
    res.status(500).json({
      message: 'Gagal'
    });
  }
});
/* DELETE end */

app.listen(3000, () => {
  console.log('Server Berjalan');
});


