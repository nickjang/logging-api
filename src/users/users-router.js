const express = require('express');
const path = require('path');
const { requireAuth } = require('../middleware/jwt-auth');
const UsersService = require('./users-service');

const usersRouter = express.Router();
const jsonBodyParser = express.json();

usersRouter
  .route('/')
  .all(jsonBodyParser)
  .post((req, res, next) => {
    const { password, email, full_name, nickname } = req.body;

    for (const field of ['full_name', 'email', 'password'])
      if (!req.body[field])
        return res.status(400).json({
          error: `Missing '${field}' in request body`
        });

    const passwordError = UsersService.validatePassword(password);

    if (passwordError)
      return res.status(400).json({ error: passwordError });

    UsersService.hasUserWithemail(
      req.app.get('db'),
      email
    )
      .then(hasUserWithemail => {
        if (hasUserWithemail)
          return res.status(400).json({ error: 'email already taken' });

        return UsersService.hashPassword(password)
          .then(hashedPassword => {
            const newUser = {
              email,
              password: hashedPassword,
              full_name,
              nickname,
              date_created: 'now()',
            };

            return UsersService.insertUser(
              req.app.get('db'),
              newUser
            )
              .then(user => {
                res
                  .status(201)
                  .location(path.posix.join(req.originalUrl, `/${user.id}`))
                  .json(UsersService.serializeUser(user));
              });
          });
      })
      .catch(next);
  })
  .all(requireAuth)
  .patch(async (req, res, next) => {
    const { password, email } = req.body;
    let updates = { date_modified: 'now()' };

    if (!password && !email)
      return res.status(400).json({
        error: 'Missing \'email\' or \'password\' in request body'
      });

    if (email) {
      const hasUserWithEmail = await UsersService.hasUserWithemail(
        req.app.get('db'),
        email
      );

      if (hasUserWithemail)
        return res.status(400).json({ error: 'Email already taken' });
      else
        updates['email'] = email;
    }

    if (password) {
      const passwordError = UsersService.validatePassword(password);

      if (passwordError)
        return res.status(400).json({ error: passwordError });

      const hashedPassword = await UsersService.hashPassword(password);
      updates['password'] = hashedPassword;
    }

    return UsersService.updateUser(
      req.app.get('db'),
      req.user.id,
      updates
    )
      .then(user => {
        res
          .status(204)
          .location(path.posix.join(req.originalUrl, `/${user.id}`))
          .json(UsersService.serializeUser(user));
      })
      .catch(next);
  })
  .delete((req, res, next) => {
    return UsersService.deleteUser(
      req.app.get('db'),
      req.user.id
    )
      .then(() => {
        res
          .status(204)
          .send();
      })
      .catch(next);
  });

module.exports = usersRouter;
